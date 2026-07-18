import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {TvCatalogSnapshot} from "@/lib/server/domain/media/tv/catalog/tv-catalog-snapshot";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.repository";
import {TvLibraryService} from "@/lib/server/domain/media/tv/library/tv-library.service";
import {withTransaction} from "@/lib/server/database/async-storage";
import {TvMediaType} from "@/lib/types/media-kind.types";


/** Owns catalog refresh reconciliation across the catalog and library aggregates. */
export class TvCatalogIngestionCommand<K extends TvMediaType> implements CatalogIngestionCommands<TvCatalogSnapshot> {
    constructor(
        private readonly catalog: TvCatalogIngestionRepository,
        private readonly library: TvLibraryService<K>,
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
                await this.library.reconcileCatalogMetadata(previousEntries);
            }
            return updated;
        });
    }
}
