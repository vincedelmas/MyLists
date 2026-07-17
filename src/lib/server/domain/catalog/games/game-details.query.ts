import {MediaType} from "@/lib/utils/enums";
import {GameCatalogReadRepository} from "@/lib/server/domain/catalog/games/game-catalog-read.repository";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";
import {GameDetailsPage} from "@/lib/contracts/media/details";


/** Complete read boundary for the game detail page. */
export class GameDetailsQuery {
    constructor(
        private readonly catalog = new GameCatalogReadRepository(),
        private readonly library = new GameLibraryReadRepository(),
    ) {}

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number): Promise<GameDetailsPage | undefined> {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;
        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);
        return {
            kind: MediaType.GAMES,
            media: { ...media, kind: MediaType.GAMES },
            userMedia: userMedia ? { ...userMedia, kind: MediaType.GAMES } : null,
            followsData: followsData.map((follow) => ({
                ...follow,
                kind: MediaType.GAMES,
                userMedia: { ...follow.userMedia, kind: MediaType.GAMES },
            })),
            similarMedia,
        };
    }

}
