import {withTransaction} from "@/lib/server/database/async-storage";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {BookCatalogSnapshot} from "@/lib/server/domain/media/books/catalog/book-catalog-snapshot";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-ingestion.repository";
import {BookLibraryService} from "@/lib/server/domain/media/books/library/book-library.service";


/** Owns catalog refresh reconciliation across the book catalog and user libraries. */
export class BookCatalogIngestionCommand implements CatalogIngestionCommands<BookCatalogSnapshot> {
    constructor(
        private readonly catalog: BookCatalogIngestionRepository,
        private readonly library = new BookLibraryService(),
    ) {
    }

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    ingest(details: BookCatalogSnapshot) {
        return withTransaction(() => this.catalog.insertSnapshot(details));
    }

    refresh(details: BookCatalogSnapshot) {
        return withTransaction(async () => {
            const existing = await this.catalog.findByApiId(details.apiId);
            if (!existing) return false;
            const previousEntries = await this.library.findEntriesByCatalogItem(existing.id);
            const updated = await this.catalog.replaceSnapshot(details);
            if (updated && previousEntries.length > 0) {
                await this.library.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
