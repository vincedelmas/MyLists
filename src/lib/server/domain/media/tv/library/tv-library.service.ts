import {FormattedError} from "@/lib/utils/error-classes";
import {JobType, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserCustomCover, UpdateUserMedia} from "@/lib/contracts/media/library";
import {TvFinalListInsert} from "@/lib/server/domain/media/tv/imports/tv-import.schemas";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
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
    TvProgressState,
    TvSeasonRewatchState,
} from "@/lib/server/domain/media/tv/library/tv-progress";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {TvListArgs} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {TvStatsRepository} from "@/lib/server/domain/media/tv/library/tv-stats.repository";
import {exportTvLibraryCsv} from "@/lib/server/domain/media/tv/library/tv-library-csv-export";
import {prepareLibraryCustomCover} from "@/lib/server/domain/media/shared/library/library-custom-cover";
import type {UpComingMedia} from "@/lib/types/notifications.types";


/** Complete series/anime library capability over one persistence boundary. */
export class TvLibraryService<K extends TvMediaType = TvMediaType> {
    readonly stats: TvStatsRepository;
    readonly export: { csv: (userId: number) => ReturnType<typeof exportTvLibraryCsv> };

    constructor(
        private readonly kind: K,
        private readonly repository = new TvLibraryRepository(kind),
    ) {
        this.stats = new TvStatsRepository(kind);
        this.export = { csv: (userId: number) => exportTvLibraryCsv(kind, userId) };
    }

    getUserMediaHistory(userId: number, catalogItemId: number) {
        return this.repository.getUserMediaHistory(userId, catalogItemId);
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

    getListHeader(userId: number) {
        return this.repository.getListHeader(userId);
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

    getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        return this.repository.getTagsView(access, search);
    }

    getTagNames(userId: number) {
        return this.repository.getTagNames(userId);
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
                return this.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
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

    async editTag(params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) {
        const libraryEntryId = params.mediaId
            ? (await this.get(params.userId, params.mediaId))?.id
            : undefined;
        return this.repository.editTag({
            userId: params.userId,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
            libraryEntryId,
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
        const entryId = await this.repository.createEntry({
            userId: params.userId,
            catalogItemId: params.catalogItemId,
            status,
            progress,
        });
        const created = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(undefined, created);

        if (!params.silent) {
            await this.repository.recordChange(entryId, UpdateType.STATUS, null, status);
            await this.recordActivity(undefined, created);
        }
        return created;
    }

    get(userId: number, catalogItemId: number) {
        return this.repository.findEntry(userId, catalogItemId);
    }

    async updateRating(params: { userId: number; catalogItemId: number; rating: number | null }) {
        if (params.rating !== null && (params.rating < 0 || params.rating > 10)) {
            throw new FormattedError("Rating must be between 0 and 10.");
        }
        return this.updateCommon(params, { rating: params.rating });
    }

    async updateComment(params: { userId: number; catalogItemId: number; comment: string | null }) {
        return this.updateCommon(params, { comment: params.comment });
    }

    async updateFavorite(params: { userId: number; catalogItemId: number; favorite: boolean }) {
        return this.updateCommon(params, { favorite: params.favorite });
    }

    async updateCustomCover(userId: number, input: UpdateUserCustomCover) {
        const current = await this.requireEntry(userId, input.mediaId);
        const customCover = await prepareLibraryCustomCover(this.kind, input);
        await this.repository.updateCommonFields(current.id, { customCover });

        const result = await this.repository.findUserMedia(userId, input.mediaId);
        if (!result) throw new FormattedError("Media not in your list");
        return result;
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
        await this.applyStatsTransition(undefined, imported);
        return imported;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const nextProgress = changeTvStatus(current.progress, params.status, current.seasons);
        return this.persistTransition(current, nextProgress, UpdateType.STATUS, current.progress.status, params.status, params.loggedAt);
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
        return this.persistTransition(current, nextProgress, UpdateType.TV, oldPosition, newPosition, params.loggedAt);
    }

    async replaceRewatches(params: {
        userId: number;
        catalogItemId: number;
        rewatches: TvSeasonRewatchState[];
        loggedAt?: string;
    }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const nextProgress = replaceTvRewatches(current.progress, params.rewatches, current.seasons);
        return this.persistTransition(
            current,
            nextProgress,
            UpdateType.REDO,
            totalTvRewatchCount(current.progress),
            totalTvRewatchCount(nextProgress),
            params.loggedAt,
        );
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, undefined);
        await this.repository.removeEntry(current.id);
    }

    async synchronizeProfileChannel(params: {
        userId: number;
        enabled: boolean;
        views: number;
    }) {
        await this.repository.synchronizeProfileChannel(params.userId, params.enabled, params.views);
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
            await this.applyStatsTransition(previous, reconciled);
        }
    }

    private async persistTransition(
        current: TvLibraryEntry,
        nextProgress: TvProgressState,
        updateType: UpdateType,
        oldValue: LibraryChangeValue,
        newValue: LibraryChangeValue,
        loggedAt?: string,
    ) {
        await this.repository.saveProgress(current, nextProgress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.applyStatsTransition(current, updated);
        await this.recordActivity(current, updated, loggedAt);
        await this.repository.recordChange(current.id, updateType, oldValue, newValue, loggedAt);
        return updated;
    }

    private async updateCommon(
        params: { userId: number; catalogItemId: number },
        fields: Parameters<TvLibraryRepository["updateCommonFields"]>[1],
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.updateCommonFields(current.id, fields);
        const updated = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, updated);
        return updated;
    }

    private async applyStatsTransition(before?: TvLibraryEntry, after?: TvLibraryEntry) {
        const sample = after ?? before;
        if (!sample) return;

        const current = await this.repository.getStats(sample.userId);
        const beforeMetrics = entryMetrics(before);
        const afterMetrics = entryMetrics(after);
        const statusCounts = { ...(current?.statusCounts ?? {}) };

        if (before) statusCounts[before.progress.status] = Math.max(0, (statusCounts[before.progress.status] ?? 0) - 1);
        if (after) statusCounts[after.progress.status] = (statusCounts[after.progress.status] ?? 0) + 1;

        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

        await this.repository.saveStats({
            userId: sample.userId,
            kind: sample.kind,
            timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
            totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
            totalRedo: Math.max(0, (current?.totalRedo ?? 0) + afterMetrics.redo - beforeMetrics.redo),
            entriesRated,
            ratingSum,
            entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
            entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
            totalSpecific: Math.max(0, (current?.totalSpecific ?? 0) + afterMetrics.consumed - beforeMetrics.consumed),
            statusCounts,
            averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
        });
    }

    private async recordActivity(before: TvLibraryEntry | undefined, after: TvLibraryEntry, loggedAt?: string) {
        const beforeConsumed = before ? consumedEpisodeCount(before.progress, before.seasons) : 0;
        const afterConsumed = consumedEpisodeCount(after.progress, after.seasons);
        const beforeRedo = before ? totalTvRewatchCount(before.progress) : 0;
        const afterRedo = totalTvRewatchCount(after.progress);
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();

        await this.repository.recordActivity({
            entryId: after.id,
            unitsGained: afterConsumed - beforeConsumed,
            completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
            redo: afterRedo > beforeRedo,
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


const entryMetrics = (entry?: TvLibraryEntry) => {
    if (!entry) return { consumed: 0, time: 0, redo: 0, rated: 0, rating: 0, commented: 0, favorited: 0 };

    const consumed = consumedEpisodeCount(entry.progress, entry.seasons);
    return {
        consumed,
        time: consumed * entry.episodeDurationMinutes,
        redo: totalTvRewatchCount(entry.progress),
        rated: Number(entry.rating !== null),
        rating: entry.rating ?? 0,
        commented: Number(!!entry.comment),
        favorited: Number(entry.favorite),
    };
};
