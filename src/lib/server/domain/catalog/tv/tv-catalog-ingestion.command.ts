import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertTvWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {withTransaction} from "@/lib/server/database/async-storage";


/** Owns catalog refresh reconciliation across the catalog and library aggregates. */
export class TvCatalogIngestionCommand implements MediaIngestionRepository<UpsertTvWithDetails> {
    constructor(
        private readonly catalog: TvCatalogIngestionRepository,
        private readonly library = new TvLibraryRepository(),
        private readonly libraryCommands = new TvLibraryCommands(library),
    ) {}

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    storeMediaWithDetails(details: UpsertTvWithDetails) {
        return withTransaction(() => this.catalog.storeMediaWithDetails(details));
    }

    updateMediaWithDetails(details: UpsertTvWithDetails) {
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
