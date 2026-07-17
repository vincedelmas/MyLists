import {withTransaction} from "@/lib/server/database/async-storage";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {MangaCatalogSnapshot} from "@/lib/server/domain/media/manga/catalog/manga-catalog-snapshot";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/media/manga/catalog/manga-catalog-ingestion.repository";
import {MangaLibraryCommands} from "@/lib/server/domain/media/manga/library/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/media/manga/library/manga-library.repository";


/** Owns catalog refresh reconciliation across the manga catalog and user libraries. */
export class MangaCatalogIngestionCommand implements CatalogIngestionCommands<MangaCatalogSnapshot> {
    constructor(
        private readonly catalog: MangaCatalogIngestionRepository,
        private readonly library = new MangaLibraryRepository(),
        private readonly libraryCommands = new MangaLibraryCommands(library),
    ) {
    }

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    ingest(details: MangaCatalogSnapshot) {
        return withTransaction(() => this.catalog.insertSnapshot(details));
    }

    refresh(details: MangaCatalogSnapshot) {
        return withTransaction(async () => {
            const existing = await this.catalog.findByApiId(details.apiId);
            if (!existing) return false;
            const previousEntries = await this.library.findEntriesByCatalogItem(existing.id);
            const updated = await this.catalog.replaceSnapshot(details);
            if (updated && previousEntries.length > 0) {
                await this.libraryCommands.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
