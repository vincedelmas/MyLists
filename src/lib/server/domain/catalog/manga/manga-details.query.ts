import {MediaType} from "@/lib/utils/enums";
import {MangaCatalogReadRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-read.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";
import {MangaDetailsPage} from "@/lib/contracts/media/details";


/** Complete read boundary for the manga detail page. */
export class MangaDetailsQuery {
    private readonly catalog = new MangaCatalogReadRepository();
    private readonly library = new MangaLibraryReadRepository();

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number): Promise<MangaDetailsPage | undefined> {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;
        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);
        return {
            kind: MediaType.MANGA,
            media: { ...media, kind: MediaType.MANGA },
            userMedia: userMedia ? { ...userMedia, kind: MediaType.MANGA } : null,
            followsData: followsData.map((follow) => ({
                ...follow,
                kind: MediaType.MANGA,
                userMedia: { ...follow.userMedia, kind: MediaType.MANGA },
            })),
            similarMedia,
        };
    }

}
