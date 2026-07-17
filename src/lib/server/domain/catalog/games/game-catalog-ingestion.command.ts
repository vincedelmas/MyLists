import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {UpsertGameWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.repository";


/** Owns the multi-table IGDB/HLTB catalog write transaction. */
export class GameCatalogIngestionCommand implements MediaIngestionRepository<UpsertGameWithDetails> {
    constructor(private readonly catalog: GameCatalogIngestionRepository) {}

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    storeMediaWithDetails(details: UpsertGameWithDetails) {
        return withTransaction(() => this.catalog.storeMediaWithDetails(details));
    }

    updateMediaWithDetails(details: UpsertGameWithDetails) {
        return withTransaction(() => this.catalog.updateMediaWithDetails(details));
    }
}
