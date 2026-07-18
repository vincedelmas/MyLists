import {FormattedError} from "@/lib/utils/error-classes";
import {GamesPlatformsEnum, JobType, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserCustomCover, UpdateUserMedia} from "@/lib/contracts/media/library";
import {GamesFinalListInsert} from "@/lib/server/domain/media/games/imports/game-import.schemas";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {GameLibraryEntry, GameLibraryRepository} from "@/lib/server/domain/media/games/library/game-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {changeGameStatus, createInitialGameProgress, importGameProgress, replaceGamePlatform, replaceGamePlaytime,} from "@/lib/server/domain/media/games/library/game-progress";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {GameListArgs} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {GameStatsRepository} from "@/lib/server/domain/media/games/library/game-stats.repository";
import {exportGameLibraryCsv} from "@/lib/server/domain/media/games/library/game-library-csv-export";
import {prepareLibraryCustomCover} from "@/lib/server/domain/media/shared/library/library-custom-cover";
import type {UpComingMedia} from "@/lib/types/notifications.types";


/** Complete game library capability over one persistence boundary. */
export class GameLibraryService {
    readonly stats = GameStatsRepository;
    readonly export = { csv: exportGameLibraryCsv };

    constructor(private readonly repository = new GameLibraryRepository()) {
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

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: GameListArgs) {
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

    async update(params: { userId: number; mediaId: number; payload: Extract<UpdateUserMedia, { mediaType: typeof MediaType.GAMES }>["payload"] }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };
        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("Game status payload is missing status.");
                return this.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.PLAYTIME:
                if (params.payload.playtime === undefined) throw new Error("Game playtime payload is missing playtime.");
                return this.replacePlaytime({ ...common, playtime: params.payload.playtime, loggedAt: params.payload.loggedAt });
            case UpdateType.PLATFORM:
                if (params.payload.platform === undefined) throw new Error("Game platform payload is missing platform.");
                return this.replacePlatform({ ...common, platform: params.payload.platform });
            case UpdateType.RATING:
                return this.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported game update type.");
        }
    }

    async importRows(rows: GamesFinalListInsert[]) {
        return withTransaction(async () => {
            for (const row of rows) {
                await this.importEntry({
                    userId: row.userId, catalogItemId: row.mediaId, status: row.status,
                    playtime: row.playtime ?? 0, platform: row.platform ?? null,
                    rating: row.rating, comment: row.comment, favorite: row.favorite,
                    customCover: row.customCover, addedAt: row.addedAt, updatedAt: row.lastUpdated,
                });
            }
        });
    }

    async editTag(params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) {
        const libraryEntryId = params.mediaId ? (await this.get(params.userId, params.mediaId))?.id : undefined;
        return this.repository.editTag({
            userId: params.userId, action: params.action,
            name: params.tag.name, oldName: params.tag.oldName, libraryEntryId,
        });
    }

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getGameCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialGameProgress(params.status ?? Status.PLAN_TO_PLAY);
        const entryId = await this.repository.createEntry({ ...params, status: progress.status, progress });
        const created = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(undefined, created);
        if (!params.silent) {
            await this.repository.recordChange(entryId, UpdateType.STATUS, null, progress.status);
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

    async updateCustomCover(userId: number, input: UpdateUserCustomCover) {
        await this.requireEntry(userId, input.mediaId);
        const customCover = await prepareLibraryCustomCover(MediaType.GAMES, input);
        await this.updateCommon({ userId, catalogItemId: input.mediaId }, { customCover });

        const result = await this.repository.findUserMedia(userId, input.mediaId);
        if (!result) throw new FormattedError("Media not in your list");
        return result;
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, undefined);
        await this.repository.removeEntry(current.id);
    }

    synchronizeProfileChannel(params: { userId: number; enabled: boolean; views: number }) {
        return this.repository.synchronizeProfileChannel(params.userId, params.enabled, params.views);
    }

    private async persistLoggedTransition(
        current: GameLibraryEntry,
        progress: GameLibraryEntry["progress"],
        updateType: typeof UpdateType.STATUS | typeof UpdateType.PLAYTIME,
        oldValue: LibraryChangeValue,
        newValue: LibraryChangeValue,
        metadata: { loggedAt?: string },
    ) {
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.applyStatsTransition(current, updated);
        await this.recordActivity(current, updated, metadata.loggedAt);
        await this.repository.recordChange(current.id, updateType, oldValue, newValue, metadata.loggedAt);
        return updated;
    }

    private async updateCommon(
        params: { userId: number; catalogItemId: number },
        fields: Parameters<GameLibraryRepository["updateCommonFields"]>[1],
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.updateCommonFields(current.id, fields);
        const updated = await this.requireEntry(params.userId, params.catalogItemId);
        await this.applyStatsTransition(current, updated);
        return updated;
    }

    private async applyStatsTransition(before?: GameLibraryEntry, after?: GameLibraryEntry) {
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
        await this.repository.recordActivity({
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
