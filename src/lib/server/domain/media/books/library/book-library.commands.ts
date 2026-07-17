import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import {BooksFinalListInsert} from "@/lib/server/domain/imports/import-media.schemas";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
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
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";


const MINUTES_PER_PAGE = 1.7;


/** Canonical book library mutation boundary. */
export class BookLibraryCommands {
    constructor(private readonly repository = new BookLibraryRepository()) {
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
                return this.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
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

    async editTag(params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) {
        const libraryEntryId = params.mediaId ? (await this.get(params.userId, params.mediaId))?.id : undefined;
        return this.repository.common.editTag({
            userId: params.userId, kind: MediaType.BOOKS, action: params.action,
            name: params.tag.name, oldName: params.tag.oldName, libraryEntryId,
        });
    }

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        const media = await this.repository.getBookCatalogItem(params.catalogItemId);
        if (!media) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialBookProgress(params.status ?? Status.PLAN_TO_READ, media.pages);
        const entryId = await this.repository.createEntry({ ...params, status: progress.status, progress });
        const created = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(undefined, created);
        if (!params.silent) {
            await this.repository.common.recordChange(entryId, UpdateType.STATUS, null, progress.status);
            await this.recordActivity(undefined, created);
        }
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
        await this.applyStatsTransition(undefined, imported);
        return imported;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.persistLoggedTransition(
            current,
            changeBookStatus(current.progress, params.status, current.pages),
            UpdateType.STATUS,
            current.progress.status,
            params.status,
            params,
        );
    }

    async replacePage(params: { userId: number; catalogItemId: number; currentPage: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.persistLoggedTransition(
            current,
            replaceBookPage(current.progress, params.currentPage, current.pages),
            UpdateType.PAGE,
            current.progress.currentPage,
            params.currentPage,
            params,
        );
    }

    async replaceRereads(params: { userId: number; catalogItemId: number; rereadCount: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.persistLoggedTransition(
            current,
            replaceBookRereads(current.progress, params.rereadCount, current.pages),
            UpdateType.REDO,
            current.progress.rereadCount,
            params.rereadCount,
            params,
        );
    }

    updateRating(params: { userId: number; catalogItemId: number; rating: number | null }) {
        if (params.rating !== null && (params.rating < 0 || params.rating > 10)) throw new FormattedError("Rating must be between 0 and 10.");
        return this.updateCommon(params, { rating: params.rating });
    }

    updateComment(params: { userId: number; catalogItemId: number; comment: string | null }) {
        return this.updateCommon(params, { comment: params.comment });
    }

    updateFavorite(params: { userId: number; catalogItemId: number; favorite: boolean }) {
        return this.updateCommon(params, { favorite: params.favorite });
    }

    updateCustomCover(params: { userId: number; catalogItemId: number; customCover: string | null }) {
        return this.updateCommon(params, { customCover: params.customCover });
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, undefined);
        await this.repository.common.removeEntry(current.id);
    }

    synchronizeProfileChannel(params: { userId: number; enabled: boolean; views: number }) {
        return this.repository.common.synchronizeProfileChannel(params.userId, MediaType.BOOKS, params.enabled, params.views);
    }

    async reconcileCatalogMetadata(previousEntries: BookLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.repository.saveProgress(current.id, reconcileBookPages(previous.progress, current.pages));
            const reconciled = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.applyStatsTransition(previous, reconciled);
        }
    }

    private async persistLoggedTransition(
        current: BookLibraryEntry,
        progress: BookLibraryEntry["progress"],
        updateType: typeof UpdateType.STATUS | typeof UpdateType.PAGE | typeof UpdateType.REDO,
        oldValue: LibraryChangeValue,
        newValue: LibraryChangeValue,
        metadata: { loggedAt?: string },
    ) {
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.applyStatsTransition(current, updated);
        await this.recordActivity(current, updated, metadata.loggedAt);
        await this.repository.common.recordChange(current.id, updateType, oldValue, newValue, metadata.loggedAt);
        return updated;
    }

    private async updateCommon(
        params: { userId: number; catalogItemId: number },
        fields: Parameters<BookLibraryRepository["common"]["updateEntry"]>[1],
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.common.updateEntry(current.id, fields);
        const updated = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, updated);
        return updated;
    }

    private async applyStatsTransition(before?: BookLibraryEntry, after?: BookLibraryEntry) {
        const sample = after ?? before;
        if (!sample) return;
        const current = await this.repository.common.getStats(sample.userId, MediaType.BOOKS);
        const beforeMetrics = entryMetrics(before);
        const afterMetrics = entryMetrics(after);
        const statusCounts = { ...(current?.statusCounts ?? {}) };
        if (before) statusCounts[before.progress.status] = Math.max(0, (statusCounts[before.progress.status] ?? 0) - 1);
        if (after) statusCounts[after.progress.status] = (statusCounts[after.progress.status] ?? 0) + 1;
        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

        await this.repository.common.saveStats({
            userId: sample.userId,
            kind: MediaType.BOOKS,
            timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
            totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
            totalRedo: Math.max(0, (current?.totalRedo ?? 0) + afterMetrics.redo - beforeMetrics.redo),
            entriesRated,
            ratingSum,
            entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
            entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
            totalSpecific: Math.max(0, (current?.totalSpecific ?? 0) + afterMetrics.pages - beforeMetrics.pages),
            statusCounts,
            averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
        });
    }

    private async recordActivity(before: BookLibraryEntry | undefined, after: BookLibraryEntry, loggedAt?: string) {
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
        await this.repository.common.recordActivity({
            entryId: after.id,
            unitsGained: after.progress.totalPagesRead - (before?.progress.totalPagesRead ?? 0),
            completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
            redo: after.progress.rereadCount > (before?.progress.rereadCount ?? 0),
            monthBucket: monthBucketFromDateInput(new Date(occurredAt)),
            occurredAt,
        });
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }
}


const entryMetrics = (entry?: BookLibraryEntry) => {
    if (!entry) return { time: 0, redo: 0, pages: 0, rated: 0, rating: 0, commented: 0, favorited: 0 };
    return {
        time: entry.progress.totalPagesRead * MINUTES_PER_PAGE,
        redo: entry.progress.rereadCount,
        pages: entry.progress.totalPagesRead,
        rated: Number(entry.rating !== null),
        rating: entry.rating ?? 0,
        commented: Number(!!entry.comment),
        favorited: Number(entry.favorite),
    };
};
