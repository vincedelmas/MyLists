import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {moviesFinalListInsertSchema, MoviesImportPayload, moviesImportPayloadSchema} from "@/lib/server/domain/media/movies/movies.types";


export class MoviesImportListWriter {
    constructor(private moviesService: MoviesService) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userMovies = matches.map(({ item, mediaId }) => {
            const partialPayload = moviesImportPayloadSchema.parse(item.payload);
            const fullPayload = this._materializeMovieListPayload(partialPayload);
            const rowToInsert = moviesFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload });

            return rowToInsert;
        });

        await this.moviesService.bulkInsertUserMedia(userMovies);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeMovieListPayload(payload: MoviesImportPayload) {
        const redo = payload.redo ?? 0;
        const total = payload.total ?? (payload.status === Status.COMPLETED ? 1 + redo : 0);

        return {
            ...payload,
            redo,
            total,
        };
    }
}
