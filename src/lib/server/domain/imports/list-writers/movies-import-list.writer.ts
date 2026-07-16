import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {moviesFinalListInsertSchema, MoviesImportPayload, moviesImportPayloadSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {MovieLibraryWriter} from "@/lib/server/domain/library/movies/movie-library.writer";


export class MoviesImportListWriter implements ImportListWriter {
    constructor(private libraryWriter: MovieLibraryWriter) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userMovies = matches.map(({ item, mediaId }) => {
            const partialPayload = moviesImportPayloadSchema.parse(item.payload);
            const fullPayload = this._materializeMovieListPayload(partialPayload);
            const rowToInsert = moviesFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload });

            return rowToInsert;
        });

        await this.libraryWriter.importRows(userMovies);

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
