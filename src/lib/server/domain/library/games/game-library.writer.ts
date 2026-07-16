import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/schemas";
import {GameLibraryRepository} from "@/lib/server/domain/library/games/game-library.repository";
import {GameLibraryService} from "@/lib/server/domain/library/games/game-library.service";
import {GamesFinalListInsert} from "@/lib/server/domain/imports/import-media.schemas";


export class GameLibraryWriter {
    private readonly repository = new GameLibraryRepository();
    private readonly library = new GameLibraryService(this.repository);

    add(params: { userId: number; mediaId: number; status?: UpdateUserMedia["payload"]["status"]; silent?: boolean }) {
        return this.library.add({ userId: params.userId, catalogItemId: params.mediaId, status: params.status, silent: params.silent });
    }

    async update(params: { userId: number; mediaId: number; payload: UpdateUserMedia["payload"] }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };
        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("Game status payload is missing status.");
                await this.library.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
                break;
            case UpdateType.PLAYTIME:
                if (params.payload.playtime === undefined) throw new Error("Game playtime payload is missing playtime.");
                await this.library.replacePlaytime({ ...common, playtime: params.payload.playtime, loggedAt: params.payload.loggedAt });
                break;
            case UpdateType.PLATFORM:
                if (params.payload.platform === undefined) throw new Error("Game platform payload is missing platform.");
                await this.library.replacePlatform({ ...common, platform: params.payload.platform });
                break;
            case UpdateType.RATING:
                await this.library.updateRating({ ...common, rating: params.payload.rating ?? null });
                break;
            case UpdateType.COMMENT:
                await this.library.updateComment({ ...common, comment: params.payload.comment ?? null });
                break;
            case UpdateType.FAVORITE:
                await this.library.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
                break;
            default:
                throw new Error(`Unsupported game update type: ${params.payload.type}`);
        }
    }

    remove(userId: number, mediaId: number) {
        return this.library.remove({ userId, catalogItemId: mediaId });
    }

    async importRows(rows: GamesFinalListInsert[]) {
        for (const row of rows) {
            await this.library.importEntry({
                userId: row.userId,
                catalogItemId: row.mediaId,
                status: row.status,
                playtime: row.playtime ?? 0,
                platform: row.platform ?? null,
                rating: row.rating,
                comment: row.comment,
                favorite: row.favorite,
                customCover: row.customCover,
                addedAt: row.addedAt,
                updatedAt: row.lastUpdated,
            });
        }
    }

    async editTag(params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) {
        const libraryEntryId = params.mediaId
            ? (await this.library.get(params.userId, params.mediaId))?.id
            : undefined;
        return this.repository.common.editTag({
            userId: params.userId,
            kind: MediaType.GAMES,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
            libraryEntryId,
        });
    }

    updateCustomCover(params: { userId: number; mediaId: number; customCover: string | null }) {
        return this.library.updateCustomCover({ userId: params.userId, catalogItemId: params.mediaId, customCover: params.customCover });
    }
}
