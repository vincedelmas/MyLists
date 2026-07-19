import {SearchType} from "@/lib/schemas";
import {FormattedError} from "@/lib/utils/error-classes";
import {MovieListArgs} from "@/lib/contracts/media/lists";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {MovieFinalListInsert} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {CommonLibraryService, LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.service";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {MovieStatsRepository} from "@/lib/server/domain/media/movies/library/movie-stats.repository";
import {exportMovieLibraryCsv} from "@/lib/server/domain/media/movies/library/movie-library-csv-export";
import {MovieLibraryEntry, MovieLibraryRepository} from "@/lib/server/domain/media/movies/library/movie-library.repository";
import {changeMovieStatus, createInitialMovieProgress, importMovieProgress, movieRedoCount, replaceMovieRewatches,} from "@/lib/server/domain/media/movies/library/movie-progress";


type MovieUpdatePayload = Extract<UpdateUserMedia, { mediaType: typeof MediaType.MOVIES }>["payload"];


export class MovieLibraryService {
    readonly stats = MovieStatsRepository;
    readonly export = { csv: exportMovieLibraryCsv };

    constructor(
        private readonly repository = new MovieLibraryRepository(),
        readonly common = new CommonLibraryService(new CommonLibraryRepository(MediaType.MOVIES)),
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

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MovieListArgs) {
        return this.repository.getMediaList(currentUserId, access, args);
    }

    getListFilters(access: MediaListAccessScope) {
        return this.repository.getListFilters(access);
    }

    getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        return this.repository.getSearchListFilters(access, query, job);
    }

    async upcoming(ownerId: number): Promise<UpComingMedia[]> {
        return this.repository.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
    }

    findEntriesByCatalogItem(catalogItemId: number) {
        return this.repository.findEntriesByCatalogItem(catalogItemId);
    }

    async update(params: { userId: number; mediaId: number; payload: MovieUpdatePayload }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };

        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) return;
                return this.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.REDO:
                return this.replaceRewatches({ ...common, rewatchCount: params.payload.rewatchCount, loggedAt: params.payload.loggedAt });
            case UpdateType.RATING:
                return this.common.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.common.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.common.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported movie update type.");
        }
    }

    async importRows(rows: MovieFinalListInsert[]) {
        return withTransaction(async () => {
            for (const row of rows) {
                await this.importEntry({
                    userId: row.userId,
                    status: row.status,
                    rating: row.rating,
                    comment: row.comment,
                    addedAt: row.addedAt,
                    favorite: row.favorite,
                    updatedAt: row.lastUpdated,
                    catalogItemId: row.mediaId,
                    rewatchCount: row.redo ?? 0,
                    customCover: row.customCover,
                });
            }
        });
    }

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialMovieProgress(params.status ?? Status.PLAN_TO_WATCH);
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

    async importEntry(params: {
        userId: number;
        status: Status;
        rewatchCount: number;
        catalogItemId: number;
        rating?: number | null;
        addedAt?: string | null;
        comment?: string | null;
        favorite?: boolean | null;
        updatedAt?: string | null;
        customCover?: string | null;
    }) {
        const existing = await this.repository.findEntry(params.userId, params.catalogItemId);
        if (existing) return existing;

        if (!await this.repository.getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        const progress = importMovieProgress(params.status, params.rewatchCount);

        await this.repository.createEntry({
            ...params,
            progress,
            status: progress.status,
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
        const progress = changeMovieStatus(current.progress, params.status);
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

    async replaceRewatches(params: { userId: number; catalogItemId: number; rewatchCount: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = replaceMovieRewatches(current.progress, params.rewatchCount);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.REDO,
            oldValue: movieRedoCount(current.progress),
            newValue: params.rewatchCount,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.common.removeEntry(current.id, statsSnapshot(current));
    }

    async reconcileCatalogMetadata(previousEntries: MovieLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.common.applyStatsTransition(statsSnapshot(previous), statsSnapshot(current));
        }
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }
}


const statsSnapshot = (entry: MovieLibraryEntry): LibraryStatsSnapshot => ({
        userId: entry.userId,
        status: entry.progress.status,
        rating: entry.rating ?? 0,
        favorited: Number(entry.favorite),
        commented: Number(!!entry.comment),
        specific: entry.progress.watchCount,
        redo: movieRedoCount(entry.progress),
        rated: Number(entry.rating !== null),
        time: entry.progress.watchCount * entry.durationMinutes,
});


const activityContribution = (before: MovieLibraryEntry | undefined, after: MovieLibraryEntry) => ({
    unitsGained: after.progress.watchCount - (before?.progress.watchCount ?? 0),
    completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
    redo: movieRedoCount(after.progress) > (before ? movieRedoCount(before.progress) : 0),
});
