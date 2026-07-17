import {withTransaction} from "@/lib/server/database/async-storage";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {GameCatalogSnapshot} from "@/lib/server/domain/media/games/catalog/game-catalog-snapshot";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.repository";


/** Owns the multi-table IGDB/HLTB catalog write transaction. */
export class GameCatalogIngestionCommand implements CatalogIngestionCommands<GameCatalogSnapshot> {
    constructor(private readonly catalog: GameCatalogIngestionRepository) {
    }

    findByApiId(apiId: number | string) {
        return this.catalog.findByApiId(apiId);
    }

    findByApiIds(apiIds: (number | string)[]) {
        return this.catalog.findByApiIds(apiIds);
    }

    ingest(details: GameCatalogSnapshot) {
        return withTransaction(() => this.catalog.insertSnapshot(details));
    }

    refresh(details: GameCatalogSnapshot) {
        return withTransaction(() => this.catalog.replaceSnapshot(details));
    }
}
