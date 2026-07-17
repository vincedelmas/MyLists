import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvDetailsPage} from "@/lib/contracts/media/details";
import {TvCatalogReadRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-read.repository";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";


/** Complete read boundary for the series/anime detail page. */
export class TvDetailsQuery<K extends TvMediaType> {
    private readonly catalog: TvCatalogReadRepository;
    private readonly library: TvLibraryReadRepository;

    constructor(private readonly kind: K) {
        this.catalog = new TvCatalogReadRepository(kind);
        this.library = new TvLibraryReadRepository(kind);
    }

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number): Promise<TvDetailsPage<K> | undefined> {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;

        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);

        return {
            kind: this.kind,
            media: { ...media, kind: this.kind },
            userMedia: userMedia ? { ...userMedia, kind: this.kind } : null,
            followsData: followsData.map((follow) => ({
                ...follow,
                kind: this.kind,
                userMedia: { ...follow.userMedia, kind: this.kind },
            })),
            similarMedia,
        };
    }

}
