import {ImportItemStatus} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {MoviesListInsert} from "@/lib/server/domain/media/movies/movies.types";


export class MoviesImportListWriter {
    constructor(private moviesService: MoviesService) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userMovies = matches.map(({ item, mediaId }) => ({
            userId,
            mediaId,
            ...item.payload,
        }) as MoviesListInsert);

        await this.moviesService.bulkInsertUserMedia(userMovies);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }
}
