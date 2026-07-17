import {notFound} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {GameCatalogEditCommand} from "@/lib/server/domain/catalog/games/game-catalog-edit.command";
import {MovieCatalogEditCommand} from "@/lib/server/domain/catalog/movies/movie-catalog-edit.command";
import {CatalogEditRequest} from "@/lib/contracts/media/catalog-edit";
import {TvCatalogEditCommand} from "@/lib/server/domain/catalog/tv/tv-catalog-edit.command";
import {BookCatalogEditCommand} from "@/lib/server/domain/catalog/books/book-catalog-edit.command";
import {MangaCatalogEditCommand} from "@/lib/server/domain/catalog/manga/manga-catalog-edit.command";
import {assertNever} from "@/lib/utils/assert-never";


/** Explicit family commands for the manager form; provider refresh remains a separate ingestion boundary. */
export class CatalogEditCommands {
    constructor(
        private readonly tv: Record<TvMediaType, Pick<TvCatalogEditCommand, "updateEditableFields">>,
        private readonly movies: MovieCatalogEditCommand,
        private readonly games: GameCatalogEditCommand,
        private readonly books: Pick<BookCatalogEditCommand, "updateEditableFields">,
        private readonly manga: Pick<MangaCatalogEditCommand, "updateEditableFields">,
    ) {
    }

    async update(request: CatalogEditRequest) {
        const { mediaId: catalogItemId, mediaType: kind } = request;
        const imageCover = await saveCover(kind, request.payload.imageCover);
        let updated: boolean;

        if (kind === MediaType.SERIES || kind === MediaType.ANIME) {
            const payload = request.payload;
            updated = await this.tv[kind].updateEditableFields(catalogItemId, {
                imageCover,
                ...payload,
            });
        }
        else if (kind === MediaType.MOVIES) {
            const payload = request.payload;
            updated = await this.movies.updateEditableFields(catalogItemId, {
                imageCover,
                ...payload,
            });
        }
        else if (kind === MediaType.GAMES) {
            const payload = request.payload;
            updated = await this.games.updateEditableFields(catalogItemId, {
                imageCover,
                ...payload,
            });
        }
        else if (kind === MediaType.BOOKS) {
            const payload = request.payload;
            updated = await this.books.updateEditableFields(catalogItemId, {
                imageCover,
                ...payload,
                authors: relationNames(payload.authors),
            });
        }
        else if (kind === MediaType.MANGA) {
            const payload = request.payload;
            updated = await this.manga.updateEditableFields(catalogItemId, {
                imageCover,
                ...payload,
                genres: relationNames(payload.genres),
            });
        }
        else {
            return assertNever(request, "catalog-edit request");
        }

        if (!updated) throw notFound();
    }
}


const saveCover = async (kind: MediaType, value: string | undefined) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return saveImageFromUrl({ imageUrl: value, dirSaveName: `${kind}-covers` });
};


const relationNames = (value: { name: string }[] | undefined) => {
    if (value === undefined) return undefined;
    return value.map(({ name }) => name.trim()).filter(Boolean);
};
