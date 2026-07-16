import {JobType} from "@/lib/utils/enums";
import {Pagination, SearchType} from "@/lib/schemas";
import {MangaCatalogReadRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-read.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";


/** Complete read boundary for the manga detail page. */
export class MangaDetailsReadService {
    private readonly catalog = new MangaCatalogReadRepository();
    private readonly library = new MangaLibraryReadRepository();

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
