import {FormattedError} from "@/lib/utils/error-classes";
import {JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import {TvFinalListInsert} from "@/lib/server/domain/media/tv/imports/tv-import.schemas";
import {TvLibraryEntry, TvLibraryRepository} from "@/lib/server/domain/media/tv/library/tv-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {
    changeTvStatus,
    consumedEpisodeCount,
    createInitialTvProgress,
    moveTvProgress,
    reconcileTvSeasons,
    replaceTvRewatches,
    totalTvRewatchCount,
    TvSeasonRewatchState,
} from "@/lib/server/domain/media/tv/library/tv-progress";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {SearchType} from "@/lib/schemas";
import {TvListArgs} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {TvStatsRepository} from "@/lib/server/domain/media/tv/library/tv-stats.repository";
import {exportTvLibraryCsv} from "@/lib/server/domain/media/tv/library/tv-library-csv-export";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {CommonLibraryService, LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.service";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";


/** Complete series/anime library capability over one persistence boundary. */
export class TvLibraryService<K extends TvMediaType = TvMediaType> {
    readonly stats: TvStatsRepository;
    readonly export: { csv: (userId: number) => ReturnType<typeof exportTvLibraryCsv> };

    constructor(
        private readonly kind: K,
        private readonly repository = new TvLibraryRepository(kind),
        readonly common = new CommonLibraryService(new CommonLibraryRepository(kind)),
    ) {
        this.stats = new TvStatsRepository(kind);
        this.export = { csv: (userId: number) => exportTvLibraryCsv(kind, userId) };
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

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: TvListArgs) {
        return this.repository.getMediaList(currentUserId, access, args);
    }

    getListFilters(access: MediaListAccessScope) {
        return this.repository.getListFilters(access);
    }

    getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        return this.repository.getSearchListFilters(access, query, job);
    }

    async upcoming(ownerId: number): Promise<UpComingMedia[]> {
        return this.repository.getUpcomingMedia({
            ownerId,
            actorId: ownerId,
            reason: "owner",
            mediaTypeEnabled: true,
        });
    }

    findEntriesByCatalogItem(catalogItemId: number) {
        return this.repository.findEntriesByCatalogItem(catalogItemId);
    }

    async update(params: { userId: number; mediaId: number; payload: Extract<UpdateUserMedia, { mediaType: typeof MediaType.SERIES }>["payload"] }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };
        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("TV status payload is missing status.");
                return this.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.TV: {
                const current = await this.requireEntry(params.userId, params.mediaId);
                return this.moveProgress({
                    ...common,
                    seasonNumber: params.payload.currentSeason ?? current.progress.currentSeason,
                    episodeNumber: params.payload.currentSeason !== undefined ? 1 : (params.payload.currentEpisode ?? current.progress.currentEpisode),
                    loggedAt: params.payload.loggedAt,
                });
            }
            case UpdateType.REDO: {
                return this.replaceRewatches({
                    ...common,
                    rewatches: params.payload.rewatches,
                    loggedAt: params.payload.loggedAt,
                });
            }
            case UpdateType.RATING:
                return this.common.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.common.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.common.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported TV update type.");
        }
    }

    async importRows(rows: TvFinalListInsert[]) {
        return withTransaction(async () => {
            for (const row of rows) {
                if (row.total === undefined) throw new Error("Materialized TV import row is missing total progress.");
                await this.importEntry({
                    userId: row.userId,
                    catalogItemId: row.mediaId,
                    status: row.status,
                    currentSeason: row.currentSeason,
                    currentEpisode: row.currentEpisode,
                    total: row.total,
                    seasonRewatchCounts: row.redo2,
                    rating: row.rating,
                    comment: row.comment,
                    favorite: row.favorite,
                    customCover: row.customCover,
                    addedAt: row.addedAt,
                    updatedAt: row.lastUpdated,
                });
            }
        });
    }

    async add(params: {
        userId: number;
        catalogItemId: number;
        status?: Status;
        silent?: boolean;
    }) {
        const media = await this.repository.getTvCatalogItem(params.catalogItemId);
        if (!media) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) {
            throw new FormattedError("Media already in your list");
        }

        const seasons = await this.repository.getSeasons(params.catalogItemId);
        const status = params.status ?? Status.PLAN_TO_WATCH;
        const progress = createInitialTvProgress(status, seasons);
        await this.repository.createEntry({
            userId: params.userId,
            catalogItemId: params.catalogItemId,
            status,
            progress,
        });
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

    /** Silent, exact final-list adapter for the retained import pipeline. */
    async importEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        currentSeason: number;
        currentEpisode: number;
        total: number;
        seasonRewatchCounts: number[];
        rating?: number | null;
        comment?: string | null;
        favorite?: boolean | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const existing = await this.repository.findEntry(params.userId, params.catalogItemId);
        if (existing) return existing;

        const media = await this.repository.getTvCatalogItem(params.catalogItemId);
        if (!media) throw new FormattedError("Media not found");
        const seasons = await this.repository.getSeasons(params.catalogItemId);
        const progressWithRewatches = replaceTvRewatches({
            status: params.status,
            currentSeason: params.currentSeason,
            currentEpisode: params.currentEpisode,
            watchedEpisodes: 0,
            rewatches: [],
        }, seasons.map((season, index) => ({
            seasonNumber: season.seasonNumber,
            count: params.seasonRewatchCounts[index] ?? 0,
        })), seasons);
        const rewatchedEpisodes = consumedEpisodeCount(progressWithRewatches, seasons);
        const progress = {
            ...progressWithRewatches,
            watchedEpisodes: Math.max(0, params.total - rewatchedEpisodes),
        };

        await this.repository.createEntry({
            userId: params.userId,
            catalogItemId: params.catalogItemId,
            status: params.status,
            progress,
            rating: params.rating ?? null,
            comment: params.comment ?? null,
            favorite: params.favorite ?? false,
            customCover: params.customCover ?? null,
            addedAt: params.addedAt,
            updatedAt: params.updatedAt,
        });
        const imported = await this.requireEntry(params.userId, params.catalogItemId);
        await this.common.applyStatsTransition(undefined, statsSnapshot(imported));
        return imported;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const nextProgress = changeTvStatus(current.progress, params.status, current.seasons);
        await this.repository.saveProgress(current, nextProgress);
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

    async moveProgress(params: {
        userId: number;
        catalogItemId: number;
        seasonNumber: number;
        episodeNumber: number;
        loggedAt?: string;
    }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const oldPosition = [current.progress.currentSeason, current.progress.currentEpisode];
        const nextProgress = moveTvProgress(current.progress, params, current.seasons);
        const newPosition = [nextProgress.currentSeason, nextProgress.currentEpisode];
        await this.repository.saveProgress(current, nextProgress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.TV,
            oldValue: oldPosition,
            newValue: newPosition,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async replaceRewatches(params: {
        userId: number;
        catalogItemId: number;
        rewatches: TvSeasonRewatchState[];
        loggedAt?: string;
    }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const nextProgress = replaceTvRewatches(current.progress, params.rewatches, current.seasons);
        await this.repository.saveProgress(current, nextProgress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.REDO,
            oldValue: totalTvRewatchCount(current.progress),
            newValue: totalTvRewatchCount(nextProgress),
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.common.removeEntry(current.id, statsSnapshot(current));
    }

    /**
     * Provider refreshes may alter episode counts. Preserve canonical absolute
     * progress, discard rewatches only for removed seasons, and repair stats
     * without creating user activity or history.
     */
    async reconcileCatalogMetadata(previousEntries: TvLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            const reconciledProgress = reconcileTvSeasons(previous.progress, current.seasons);
            await this.repository.saveProgress(current, reconciledProgress);
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


const statsSnapshot = (entry: TvLibraryEntry): LibraryStatsSnapshot => {
    const consumed = consumedEpisodeCount(entry.progress, entry.seasons);
    return {
        userId: entry.userId,
        status: entry.progress.status,
        specific: consumed,
        time: consumed * entry.episodeDurationMinutes,
        redo: totalTvRewatchCount(entry.progress),
        rated: Number(entry.rating !== null),
        rating: entry.rating ?? 0,
        commented: Number(!!entry.comment),
        favorited: Number(entry.favorite),
    };
};

const activityContribution = (before: TvLibraryEntry | undefined, after: TvLibraryEntry) => {
    const beforeConsumed = before ? consumedEpisodeCount(before.progress, before.seasons) : 0;
    const afterConsumed = consumedEpisodeCount(after.progress, after.seasons);
    const beforeRedo = before ? totalTvRewatchCount(before.progress) : 0;
    const afterRedo = totalTvRewatchCount(after.progress);
    return {
        unitsGained: afterConsumed - beforeConsumed,
        completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
        redo: afterRedo > beforeRedo,
    };
};
