import {JobType} from "@/lib/utils/enums";
import {Pagination, SearchType} from "@/lib/schemas";
import {GameCatalogReadRepository} from "@/lib/server/domain/catalog/games/game-catalog-read.repository";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";


/** Complete read boundary for the game detail page. */
export class GameDetailsReadService {
    private readonly catalog = new GameCatalogReadRepository();
    private readonly library = new GameLibraryReadRepository();

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

    getCompatiblePlatforms(catalogItemId: number) {
        return this.catalog.getCompatiblePlatforms(catalogItemId);
    }

    getMediaJobDetails(job: JobType, name: string, pagination: Pagination, viewerId?: number) {
        const page = pagination.page ?? 1;
        const perPage = pagination.perPage ?? 24;
        return this.catalog.getMediaJobDetails(job, name, (page - 1) * perPage, perPage, viewerId);
    }
}
