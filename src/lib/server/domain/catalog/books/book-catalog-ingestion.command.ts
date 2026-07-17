import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {UpsertBooksWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";
import {BookLibraryCommands} from "@/lib/server/domain/library/books/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/library/books/book-library.repository";


/** Owns catalog refresh reconciliation across the book catalog and user libraries. */
export class BookCatalogIngestionCommand implements MediaIngestionRepository<UpsertBooksWithDetails> {
    constructor(
        private readonly catalog: BookCatalogIngestionRepository,
        private readonly library = new BookLibraryRepository(),
        private readonly libraryCommands = new BookLibraryCommands(library),
    ) {}

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    storeMediaWithDetails(details: UpsertBooksWithDetails) {
        return withTransaction(() => this.catalog.storeMediaWithDetails(details));
    }

    updateMediaWithDetails(details: UpsertBooksWithDetails) {
        return withTransaction(async () => {
            const existing = await this.catalog.findByApiId(details.mediaData.apiId);
            if (!existing) return false;
            const previousEntries = await this.library.findEntriesByCatalogItem(existing.id);
            const updated = await this.catalog.updateMediaWithDetails(details);
            if (updated && previousEntries.length > 0) {
                await this.libraryCommands.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
