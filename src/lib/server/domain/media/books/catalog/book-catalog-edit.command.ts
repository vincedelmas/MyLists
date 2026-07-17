import {BookCatalogAdminRepository, BookCatalogEdit} from "@/lib/server/domain/media/books/catalog/book-catalog-admin.repository";
import {BookLibraryCommands} from "@/lib/server/domain/media/books/library/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/media/books/library/book-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {MediaType} from "@/lib/utils/enums";
import {BookCatalogEditPayload} from "@/lib/contracts/media/catalog-edit";
import {CatalogCoverStorage, relationNames} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";


export class BookCatalogEditCommand {
    constructor(
        private readonly catalog: BookCatalogAdminRepository,
        private readonly library = new BookLibraryRepository(),
        private readonly libraryCommands = new BookLibraryCommands(library),
        private readonly coverStorage = new CatalogCoverStorage(MediaType.BOOKS),
    ) {
    }

    async update(catalogItemId: number, payload: BookCatalogEditPayload) {
        const imageCover = await this.coverStorage.save(payload.imageCover);
        return this.updateEditableFields(catalogItemId, {
            ...payload,
            imageCover,
            authors: relationNames(payload.authors),
        });
    }

    updateEditableFields(catalogItemId: number, edit: BookCatalogEdit) {
        return withTransaction(async () => {
            const previousEntries = edit.pages !== undefined
                ? await this.library.findEntriesByCatalogItem(catalogItemId)
                : [];
            const updated = await this.catalog.updateEditableFields(catalogItemId, edit);
            if (updated && previousEntries.length > 0) {
                await this.libraryCommands.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
