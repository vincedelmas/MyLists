import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {UpsertMangaWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";
import {MangaLibraryCommands} from "@/lib/server/domain/library/manga/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/library/manga/manga-library.repository";


/** Owns catalog refresh reconciliation across the manga catalog and user libraries. */
export class MangaCatalogIngestionCommand implements MediaIngestionRepository<UpsertMangaWithDetails> {
    constructor(
        private readonly catalog: MangaCatalogIngestionRepository,
        private readonly library = new MangaLibraryRepository(),
        private readonly libraryCommands = new MangaLibraryCommands(library),
    ) {}

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    storeMediaWithDetails(details: UpsertMangaWithDetails) {
        return withTransaction(() => this.catalog.storeMediaWithDetails(details));
    }

    updateMediaWithDetails(details: UpsertMangaWithDetails) {
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
