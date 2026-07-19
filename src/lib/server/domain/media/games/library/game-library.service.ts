import {FormattedError} from "@/lib/utils/error-classes";
import {GamesPlatformsEnum, JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import {GamesFinalListInsert} from "@/lib/server/domain/media/games/imports/game-import.schemas";
import {GameLibraryEntry, GameLibraryRepository} from "@/lib/server/domain/media/games/library/game-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {changeGameStatus, createInitialGameProgress, importGameProgress, replaceGamePlatform, replaceGamePlaytime,} from "@/lib/server/domain/media/games/library/game-progress";
import {SearchType} from "@/lib/schemas";
import {GameListArgs} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {GameStatsRepository} from "@/lib/server/domain/media/games/library/game-stats.repository";
import {exportGameLibraryCsv} from "@/lib/server/domain/media/games/library/game-library-csv-export";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {CommonLibraryService, LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.service";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";


/** Complete game library capability over one persistence boundary. */
export class GameLibraryService {
    readonly stats = GameStatsRepository;
    readonly export = { csv: exportGameLibraryCsv };

    constructor(
        private readonly repository = new GameLibraryRepository(),
        readonly common = new CommonLibraryService(new CommonLibraryRepository(MediaType.GAMES)),
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

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: GameListArgs) {
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
                return this.common.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.common.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.common.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
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

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getGameCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialGameProgress(params.status ?? Status.PLAN_TO_PLAY);
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
        await this.common.applyStatsTransition(undefined, statsSnapshot(imported));
        return imported;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = changeGameStatus(current.progress, params.status);
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

    async replacePlaytime(params: { userId: number; catalogItemId: number; playtime: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = replaceGamePlaytime(current.progress, params.playtime);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.PLAYTIME,
            oldValue: current.progress.playtimeMinutes,
            newValue: params.playtime,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async replacePlatform(params: { userId: number; catalogItemId: number; platform: GamesPlatformsEnum | null }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        await this.repository.saveProgress(current.id, replaceGamePlatform(current.progress, params.platform));
        return this.requireEntry(current.userId, current.catalogItemId);
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.common.removeEntry(current.id, statsSnapshot(current));
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }
}


const statsSnapshot = (entry: GameLibraryEntry): LibraryStatsSnapshot => ({
    userId: entry.userId,
    status: entry.progress.status,
    time: entry.progress.playtimeMinutes,
    redo: 0,
    specific: 0,
    rated: Number(entry.rating !== null),
    rating: entry.rating ?? 0,
    commented: Number(!!entry.comment),
    favorited: Number(entry.favorite),
});

const activityContribution = (before: GameLibraryEntry | undefined, after: GameLibraryEntry) => ({
    unitsGained: after.progress.playtimeMinutes - (before?.progress.playtimeMinutes ?? 0),
    completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
    redo: false,
});
