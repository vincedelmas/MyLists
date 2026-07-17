import {BookCatalogAdminRepository, BookCatalogEdit} from "@/lib/server/domain/catalog/books/book-catalog-admin.repository";
import {BookLibraryCommands} from "@/lib/server/domain/library/books/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/library/books/book-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


export class BookCatalogEditCommand {
    constructor(
        private readonly catalog: BookCatalogAdminRepository,
        private readonly library = new BookLibraryRepository(),
        private readonly libraryCommands = new BookLibraryCommands(library),
    ) {}

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
