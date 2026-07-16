import {FormattedError} from "@/lib/utils/error-classes";
import {GamesPlatformsEnum, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {GameLibraryEntry, GameLibraryRepository} from "@/lib/server/domain/library/games/game-library.repository";
import {
    changeGameStatus,
    createInitialGameProgress,
    importGameProgress,
    replaceGamePlatform,
    replaceGamePlaytime,
} from "@/lib/server/domain/library/games/game-progress";


export class GameLibraryService {
    constructor(private readonly repository: GameLibraryRepository) {}

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getGameCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialGameProgress(params.status ?? Status.PLAN_TO_PLAY);
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
        playtime: number;
        platform: GamesPlatformsEnum | null;
        rating?: number | null;
        comment?: string | null;
        favorite?: boolean | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const existing = await this.repository.findEntry(params.userId, params.catalogItemId);
        if (existing) return existing;
        if (!await this.repository.getGameCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        const progress = importGameProgress(params.status, params.playtime, params.platform);
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
            changeGameStatus(current.progress, params.status),
            UpdateType.STATUS,
            current.progress.status,
            params.status,
            params,
        );
    }

    async replacePlaytime(params: { userId: number; catalogItemId: number; playtime: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.persistLoggedTransition(
            current,
            replaceGamePlaytime(current.progress, params.playtime),
            UpdateType.PLAYTIME,
            current.progress.playtimeMinutes,
            params.playtime,
            params,
        );
    }

    async replacePlatform(params: { userId: number; catalogItemId: number; platform: GamesPlatformsEnum | null }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.saveProgress(current.id, replaceGamePlatform(current.progress, params.platform));
        return this.requireEntry(current.userId, current.catalogItemId);
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
        return this.repository.common.synchronizeProfileChannel(params.userId, MediaType.GAMES, params.enabled, params.views);
    }

    private async persistLoggedTransition(
        current: GameLibraryEntry,
        progress: GameLibraryEntry["progress"],
        updateType: typeof UpdateType.STATUS | typeof UpdateType.PLAYTIME,
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
        fields: Parameters<GameLibraryRepository["common"]["updateEntry"]>[1],
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.common.updateEntry(current.id, fields);
        const updated = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, updated);
        return updated;
    }

    private async applyStatsTransition(before?: GameLibraryEntry, after?: GameLibraryEntry) {
        const sample = after ?? before;
        if (!sample) return;
        const current = await this.repository.common.getStats(sample.userId, MediaType.GAMES);
        const beforeMetrics = entryMetrics(before);
        const afterMetrics = entryMetrics(after);
        const statusCounts = { ...(current?.statusCounts ?? {}) };
        if (before) statusCounts[before.progress.status] = Math.max(0, (statusCounts[before.progress.status] ?? 0) - 1);
        if (after) statusCounts[after.progress.status] = (statusCounts[after.progress.status] ?? 0) + 1;
        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

        await this.repository.common.saveStats({
            userId: sample.userId,
            kind: MediaType.GAMES,
            timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
            totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
            totalRedo: 0,
            entriesRated,
            ratingSum,
            entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
            entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
            totalSpecific: 0,
            statusCounts,
            averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
        });
    }

    private async recordActivity(before: GameLibraryEntry | undefined, after: GameLibraryEntry, loggedAt?: string) {
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
        await this.repository.common.recordActivity({
            entryId: after.id,
            unitsGained: after.progress.playtimeMinutes - (before?.progress.playtimeMinutes ?? 0),
            completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
            redo: false,
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


const entryMetrics = (entry?: GameLibraryEntry) => {
    if (!entry) return { time: 0, rated: 0, rating: 0, commented: 0, favorited: 0 };
    return {
        time: entry.progress.playtimeMinutes,
        rated: Number(entry.rating !== null),
        rating: entry.rating ?? 0,
        commented: Number(!!entry.comment),
        favorited: Number(entry.favorite),
    };
};
