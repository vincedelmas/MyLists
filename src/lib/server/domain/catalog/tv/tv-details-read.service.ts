import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvCatalogReadRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-read.repository";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {JobType} from "@/lib/utils/enums";
import {Pagination, SearchType} from "@/lib/schemas";


/** Complete read boundary for the series/anime detail page. */
export class TvDetailsReadService {
    private readonly catalog: TvCatalogReadRepository;
    private readonly library: TvLibraryReadRepository;

    constructor(kind: TvMediaType) {
        this.catalog = new TvCatalogReadRepository(kind);
        this.library = new TvLibraryReadRepository(kind);
    }

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
