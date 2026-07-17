import {MediaType} from "@/lib/utils/enums";
import {BookCatalogReadRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-read.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/media/books/library/book-library-read.repository";
import {BookDetailsPage} from "@/lib/contracts/media/details";


/** Complete read boundary for the book detail page. */
export class BookDetailsQuery {
    constructor(
        private readonly catalog = new BookCatalogReadRepository(),
        private readonly library = new BookLibraryReadRepository(),
    ) {
    }

    async getMediaAndUserDetails(viewerId: number | undefined, catalogItemId: number): Promise<BookDetailsPage | undefined> {
        const media = await this.catalog.findDetails(catalogItemId);
        if (!media) return;
        const [userMedia, followsData, similarMedia] = await Promise.all([
            this.library.findUserMedia(viewerId, catalogItemId),
            this.library.findFollowedUsersMedia(viewerId, catalogItemId),
            this.catalog.findSimilar(catalogItemId),
        ]);
        return {
            kind: MediaType.BOOKS,
            media: { ...media, kind: MediaType.BOOKS },
            userMedia: userMedia ? { ...userMedia, kind: MediaType.BOOKS } : null,
            followsData: followsData.map((follow) => ({
                ...follow,
                kind: MediaType.BOOKS,
                userMedia: { ...follow.userMedia, kind: MediaType.BOOKS },
            })),
            similarMedia,
        };
    }

}
