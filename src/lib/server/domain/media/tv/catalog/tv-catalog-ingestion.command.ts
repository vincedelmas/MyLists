import {CatalogIngestionCommands, TvCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.repository";
import {TvLibraryCommands} from "@/lib/server/domain/media/tv/library/tv-library.commands";
import {TvLibraryRepository} from "@/lib/server/domain/media/tv/library/tv-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


/** Owns catalog refresh reconciliation across the catalog and library aggregates. */
export class TvCatalogIngestionCommand implements CatalogIngestionCommands<TvCatalogSnapshot> {
    constructor(
        private readonly catalog: TvCatalogIngestionRepository,
        private readonly library = new TvLibraryRepository(),
        private readonly libraryCommands = new TvLibraryCommands(library),
    ) {
    }

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    ingest(details: TvCatalogSnapshot) {
        return withTransaction(() => this.catalog.insertSnapshot(details));
    }

    refresh(details: TvCatalogSnapshot) {
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
