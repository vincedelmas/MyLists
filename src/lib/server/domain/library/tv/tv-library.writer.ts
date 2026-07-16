import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserMedia} from "@/lib/schemas";
import {TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {TvLibraryService} from "@/lib/server/domain/library/tv/tv-library.service";
import {TvFinalListInsert} from "@/lib/server/domain/imports/import-media.schemas";


type TvKind = typeof MediaType.SERIES | typeof MediaType.ANIME;


export class TvLibraryWriter {
    private readonly library = new TvLibraryService(new TvLibraryRepository());

    async add(params: { userId: number; mediaId: number; mediaType: TvKind; status?: UpdateUserMedia["payload"]["status"]; silent?: boolean }) {
        await this.library.add({
            userId: params.userId,
            catalogItemId: params.mediaId,
            status: params.status,
            silent: params.silent,
        });
    }

    async update(params: {
        userId: number;
        mediaId: number;
        mediaType: TvKind;
        payload: UpdateUserMedia["payload"];
    }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };

        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) throw new Error("TV status payload is missing status.");
                await this.library.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
                break;
            case UpdateType.TV: {
                const current = await this.library.get(params.userId, params.mediaId);
                if (!current) throw new Error("TV media is missing from the library.");
                await this.library.moveProgress({
                    ...common,
                    seasonNumber: params.payload.currentSeason ?? current.progress.currentSeason,
                    episodeNumber: params.payload.currentSeason !== undefined ? 1 : (params.payload.currentEpisode ?? current.progress.currentEpisode),
                    loggedAt: params.payload.loggedAt,
                });
                break;
            }
            case UpdateType.REDO: {
                if (!params.payload.redo2) throw new Error("TV redo payload is missing per-season counts.");
                const current = await this.library.get(params.userId, params.mediaId);
                if (!current) throw new Error("TV media is missing from the library.");
                await this.library.replaceRewatches({
                    ...common,
                    rewatches: current.seasons.map((season, index) => ({
                        seasonNumber: season.seasonNumber,
                        count: params.payload.redo2?.[index] ?? 0,
                    })),
                    loggedAt: params.payload.loggedAt,
                });
                break;
            }
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
                throw new Error(`Unsupported TV update type: ${params.payload.type}`);
        }
    }

    async remove(params: { userId: number; mediaId: number; mediaType: TvKind }) {
        await this.library.remove({ userId: params.userId, catalogItemId: params.mediaId });
    }

    async importRows(mediaType: TvKind, rows: TvFinalListInsert[]) {
        for (const row of rows) {
            if (row.total === undefined) throw new Error("Materialized TV import row is missing total progress.");
            await this.library.importEntry({
                userId: row.userId,
                catalogItemId: row.mediaId,
                status: row.status,
                currentSeason: row.currentSeason,
                currentEpisode: row.currentEpisode,
                total: row.total,
                redo2: row.redo2,
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
        mediaType: TvKind;
        mediaId?: number;
        action: TagAction;
        tag: { name: string; oldName?: string };
    }) {
        let libraryEntryId: number | undefined;
        if (params.mediaId) {
            libraryEntryId = (await this.library.get(params.userId, params.mediaId))?.id;
        }
        return new TvLibraryRepository().editTag({
            userId: params.userId,
            kind: params.mediaType,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
            libraryEntryId,
        });
    }

    async updateCustomCover(params: { userId: number; mediaType: TvKind; mediaId: number; customCover: string | null }) {
        await this.library.updateCustomCover({
            userId: params.userId,
            catalogItemId: params.mediaId,
            customCover: params.customCover,
        });
    }
}
