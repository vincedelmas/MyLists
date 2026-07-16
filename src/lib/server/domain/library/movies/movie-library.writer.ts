import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/schemas";
import {MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {MovieLibraryService} from "@/lib/server/domain/library/movies/movie-library.service";
import {MovieFinalListInsert} from "@/lib/server/domain/imports/import-media.schemas";


export class MovieLibraryWriter {
    private readonly repository = new MovieLibraryRepository();
    private readonly library = new MovieLibraryService(this.repository);

    add(params: {
        userId: number;
        mediaId: number;
        status?: UpdateUserMedia["payload"]["status"];
        silent?: boolean;
    }) {
        return this.library.add({
            userId: params.userId,
            catalogItemId: params.mediaId,
            status: params.status,
            silent: params.silent,
        });
    }

    async update(params: { userId: number; mediaId: number; payload: UpdateUserMedia["payload"] }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };
        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("Movie status payload is missing status.");
                await this.library.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
                break;
            case UpdateType.REDO:
                if (params.payload.redo === undefined) throw new Error("Movie redo payload is missing a count.");
                await this.library.replaceRewatches({ ...common, redo: params.payload.redo, loggedAt: params.payload.loggedAt });
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
                throw new Error(`Unsupported movie update type: ${params.payload.type}`);
        }
    }

    remove(userId: number, mediaId: number) {
        return this.library.remove({ userId, catalogItemId: mediaId });
    }

    async importRows(rows: MovieFinalListInsert[]) {
        for (const row of rows) {
            await this.library.importEntry({
                userId: row.userId,
                catalogItemId: row.mediaId,
                status: row.status,
                redo: row.redo ?? 0,
                rating: row.rating,
                comment: row.comment,
                favorite: row.favorite,
                customCover: row.customCover,
                addedAt: row.addedAt,
                updatedAt: row.lastUpdated,
            });
        }
    }

    async editTag(params: {
        userId: number;
        mediaId?: number;
        action: TagAction;
        tag: { name: string; oldName?: string };
    }) {
        const libraryEntryId = params.mediaId
            ? (await this.library.get(params.userId, params.mediaId))?.id
            : undefined;
        return this.repository.common.editTag({
            userId: params.userId,
            kind: MediaType.MOVIES,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
            libraryEntryId,
        });
    }

    updateCustomCover(params: { userId: number; mediaId: number; customCover: string | null }) {
        return this.library.updateCustomCover({
            userId: params.userId,
            catalogItemId: params.mediaId,
            customCover: params.customCover,
        });
    }
}
