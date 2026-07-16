import {JobType} from "@/lib/utils/enums";
import {Pagination, SearchType} from "@/lib/schemas";
import {MovieCatalogReadRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/library/movies/movie-library-read.repository";


/** Complete read boundary for the movie detail page. */
export class MovieDetailsReadService {
    private readonly catalog = new MovieCatalogReadRepository();
    private readonly library = new MovieLibraryReadRepository();

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number) {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;
        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);
        return { media, userMedia, followsData, similarMedia };
    }

    getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType) {
        return this.library.getCommunityActivity(viewerId, catalogItemId, search);
    }

    getUserMediaHistory(userId: number, catalogItemId: number) {
        return this.library.getUserMediaHistory(userId, catalogItemId);
    }

    getMediaJobDetails(job: JobType, name: string, pagination: Pagination, viewerId?: number) {
        const page = pagination.page ?? 1;
        const perPage = pagination.perPage ?? 24;
        return this.catalog.getMediaJobDetails(job, name, (page - 1) * perPage, perPage, viewerId);
    }
}
