import {MediaType} from "@/lib/utils/enums";
import {MovieCatalogReadRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-read.repository";
import {MovieLibraryService} from "@/lib/server/domain/media/movies/library/movie-library.service";
import {MovieDetailsPage} from "@/lib/contracts/media/details";


/** Complete read boundary for the movie detail page. */
export class MovieDetailsQuery {
    constructor(
        private readonly catalog = new MovieCatalogReadRepository(),
        private readonly library = new MovieLibraryService(),
    ) {
    }

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number): Promise<MovieDetailsPage | undefined> {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;
        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);
        return {
            kind: MediaType.MOVIES,
            media: { ...media, kind: MediaType.MOVIES },
            userMedia: userMedia ? { ...userMedia, kind: MediaType.MOVIES } : null,
            followsData: followsData.map((follow) => ({
                ...follow,
                kind: MediaType.MOVIES,
                userMedia: { ...follow.userMedia, kind: MediaType.MOVIES },
            })),
            similarMedia,
        };
    }

}
