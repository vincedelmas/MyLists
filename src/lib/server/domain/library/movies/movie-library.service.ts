import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {MovieLibraryEntry, MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {
    changeMovieStatus,
    createInitialMovieProgress,
    importMovieProgress,
    movieRedoCount,
    MovieProgressState,
    replaceMovieRewatches,
} from "@/lib/server/domain/library/movies/movie-progress";


export class MovieLibraryService {
    constructor(private readonly repository: MovieLibraryRepository) {}

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialMovieProgress(params.status ?? Status.PLAN_TO_WATCH);
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
        redo: number;
        rating?: number | null;
        comment?: string | null;
        favorite?: boolean | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const existing = await this.repository.findEntry(params.userId, params.catalogItemId);
        if (existing) return existing;
        if (!await this.repository.getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        const progress = importMovieProgress(params.status, params.redo);
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
        return this.persistTransition(
            current,
            changeMovieStatus(current.progress, params.status),
            UpdateType.STATUS,
            current.progress.status,
            params.status,
            params,
        );
    }

    async replaceRewatches(params: { userId: number; catalogItemId: number; redo: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.persistTransition(
            current,
            replaceMovieRewatches(current.progress, params.redo),
            UpdateType.REDO,
            movieRedoCount(current.progress),
            params.redo,
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
        return this.repository.common.synchronizeProfileChannel(
            params.userId,
            MediaType.MOVIES,
            params.enabled,
            params.views,
        );
    }

    async reconcileCatalogMetadata(previousEntries: MovieLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.applyStatsTransition(previous, current);
        }
    }

    private async persistTransition(
        current: MovieLibraryEntry,
        progress: MovieProgressState,
        updateType: UpdateType,
        oldValue: unknown,
        newValue: unknown,
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
        fields: Parameters<MovieLibraryRepository["common"]["updateEntry"]>[1],
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.common.updateEntry(current.id, fields);
        const updated = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, updated);
        return updated;
    }

    private async applyStatsTransition(before?: MovieLibraryEntry, after?: MovieLibraryEntry) {
        const sample = after ?? before;
        if (!sample) return;
        const current = await this.repository.common.getStats(sample.userId, MediaType.MOVIES);
        const beforeMetrics = entryMetrics(before);
        const afterMetrics = entryMetrics(after);
        const statusCounts = { ...(current?.statusCounts ?? {}) };
        if (before) statusCounts[before.progress.status] = Math.max(0, (statusCounts[before.progress.status] ?? 0) - 1);
        if (after) statusCounts[after.progress.status] = (statusCounts[after.progress.status] ?? 0) + 1;
        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

        await this.repository.common.saveStats({
            userId: sample.userId,
            kind: MediaType.MOVIES,
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

    private async recordActivity(before: MovieLibraryEntry | undefined, after: MovieLibraryEntry, loggedAt?: string) {
        const beforeCount = before?.progress.watchCount ?? 0;
        const afterCount = after.progress.watchCount;
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
        await this.repository.common.recordActivity({
            entryId: after.id,
            unitsGained: afterCount - beforeCount,
            completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
            redo: movieRedoCount(after.progress) > movieRedoCount(before?.progress ?? { status: Status.PLAN_TO_WATCH, watchCount: 0 }),
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


const entryMetrics = (entry?: MovieLibraryEntry) => {
    if (!entry) return { consumed: 0, time: 0, redo: 0, rated: 0, rating: 0, commented: 0, favorited: 0 };
    return {
        consumed: entry.progress.watchCount,
        time: entry.progress.watchCount * entry.durationMinutes,
        redo: movieRedoCount(entry.progress),
        rated: Number(entry.rating !== null),
        rating: entry.rating ?? 0,
        commented: Number(!!entry.comment),
        favorited: Number(entry.favorite),
    };
};
