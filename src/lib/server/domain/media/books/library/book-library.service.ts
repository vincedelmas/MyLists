import {FormattedError} from "@/lib/utils/error-classes";
import {JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import {BooksFinalListInsert} from "@/lib/server/domain/media/books/imports/book-import.schemas";
import {BookLibraryEntry, BookLibraryRepository} from "@/lib/server/domain/media/books/library/book-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {
    changeBookStatus,
    createInitialBookProgress,
    importBookProgress,
    reconcileBookPages,
    replaceBookPage,
    replaceBookRereads
} from "@/lib/server/domain/media/books/library/book-progress";
import {SearchType} from "@/lib/schemas";
import {BookListArgs} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {BookStatsRepository} from "@/lib/server/domain/media/books/library/book-stats.repository";
import {exportBookLibraryCsv} from "@/lib/server/domain/media/books/library/book-library-csv-export";
import {CommonLibraryService, LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.service";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";


const MINUTES_PER_PAGE = 1.7;


/** Complete book library capability over one persistence boundary. */
export class BookLibraryService {
    readonly stats = BookStatsRepository;
    readonly export = { csv: exportBookLibraryCsv };

    constructor(
        private readonly repository = new BookLibraryRepository(),
        readonly common = new CommonLibraryService(new CommonLibraryRepository(MediaType.BOOKS)),
    ) {
    }

    findUserMedia(userId: number | undefined, catalogItemId: number) {
        return this.repository.findUserMedia(userId, catalogItemId);
    }

    findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        return this.repository.findFollowedUsersMedia(viewerId, catalogItemId);
    }

    getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType) {
        return this.repository.getCommunityActivity(viewerId, catalogItemId, search);
    }

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: BookListArgs) {
        return this.repository.getMediaList(currentUserId, access, args);
    }

    getListFilters(access: MediaListAccessScope) {
        return this.repository.getListFilters(access);
    }

    getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        return this.repository.getSearchListFilters(access, query, job);
    }

    findEntriesByCatalogItem(catalogItemId: number) {
        return this.repository.findEntriesByCatalogItem(catalogItemId);
    }

    async update(params: { userId: number; mediaId: number; payload: Extract<UpdateUserMedia, { mediaType: typeof MediaType.BOOKS }>["payload"] }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };
        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("Book status payload is missing status.");
                return this.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.PAGE:
                return this.replacePage({ ...common, currentPage: params.payload.currentPage, loggedAt: params.payload.loggedAt });
            case UpdateType.REDO:
                return this.replaceRereads({ ...common, rereadCount: params.payload.rereadCount, loggedAt: params.payload.loggedAt });
            case UpdateType.RATING:
                return this.common.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.common.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.common.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported book update type.");
        }
    }

    async importRows(rows: BooksFinalListInsert[]) {
        return withTransaction(async () => {
            for (const row of rows) {
                await this.importEntry({
                    userId: row.userId, catalogItemId: row.mediaId, status: row.status,
                    currentPage: row.actualPage ?? null, rereadCount: row.redo ?? 0, totalPagesRead: row.total ?? 0,
                    rating: row.rating, comment: row.comment, favorite: row.favorite,
                    customCover: row.customCover, addedAt: row.addedAt, updatedAt: row.lastUpdated,
                });
            }
        });
    }

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        const media = await this.repository.getBookCatalogItem(params.catalogItemId);
        if (!media) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialBookProgress(params.status ?? Status.PLAN_TO_READ, media.pages);
        await this.repository.createEntry({ ...params, status: progress.status, progress });
        const created = await this.requireEntry(params.userId, params.catalogItemId);
        await this.common.recordCreatedEntry({
            entryId: created.id,
            snapshot: statsSnapshot(created),
            activity: activityContribution(undefined, created),
            silent: params.silent,
        });
        return created;
    }

    get(userId: number, catalogItemId: number) {
        return this.repository.findEntry(userId, catalogItemId);
    }

    async importEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        currentPage: number | null;
        rereadCount: number;
        totalPagesRead: number;
        rating?: number | null;
        comment?: string | null;
        favorite?: boolean | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const existing = await this.repository.findEntry(params.userId, params.catalogItemId);
        if (existing) return existing;
        if (!await this.repository.getBookCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        const progress = importBookProgress(params.status, params.currentPage, params.rereadCount, params.totalPagesRead);
        await this.repository.createEntry({
            ...params,
            status: progress.status,
            progress,
            rating: params.rating ?? null,
            comment: params.comment ?? null,
            favorite: params.favorite ?? false,
            customCover: params.customCover ?? null,
        });
        const imported = await this.requireEntry(params.userId, params.catalogItemId);
        await this.common.applyStatsTransition(undefined, statsSnapshot(imported));
        return imported;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = changeBookStatus(current.progress, params.status, current.pages);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.STATUS,
            oldValue: current.progress.status,
            newValue: params.status,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async replacePage(params: { userId: number; catalogItemId: number; currentPage: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = replaceBookPage(current.progress, params.currentPage, current.pages);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.PAGE,
            oldValue: current.progress.currentPage,
            newValue: params.currentPage,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async replaceRereads(params: { userId: number; catalogItemId: number; rereadCount: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = replaceBookRereads(current.progress, params.rereadCount, current.pages);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.REDO,
            oldValue: current.progress.rereadCount,
            newValue: params.rereadCount,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.common.removeEntry(current.id, statsSnapshot(current));
    }

    async reconcileCatalogMetadata(previousEntries: BookLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.repository.saveProgress(current.id, reconcileBookPages(previous.progress, current.pages));
            const reconciled = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.common.applyStatsTransition(statsSnapshot(previous), statsSnapshot(reconciled));
        }
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }
}


const statsSnapshot = (entry: BookLibraryEntry): LibraryStatsSnapshot => ({
    userId: entry.userId,
    status: entry.progress.status,
    time: entry.progress.totalPagesRead * MINUTES_PER_PAGE,
    redo: entry.progress.rereadCount,
    specific: entry.progress.totalPagesRead,
    rated: Number(entry.rating !== null),
    rating: entry.rating ?? 0,
    commented: Number(!!entry.comment),
    favorited: Number(entry.favorite),
});

const activityContribution = (before: BookLibraryEntry | undefined, after: BookLibraryEntry) => ({
    unitsGained: after.progress.totalPagesRead - (before?.progress.totalPagesRead ?? 0),
    completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
    redo: after.progress.rereadCount > (before?.progress.rereadCount ?? 0),
});
