import {and, eq, gte, isNull, lte, or, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem} from "@/lib/server/database/schema";


export class GameCatalogRefreshCandidatesQuery {
    getCandidateApiIds() {
        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.locked, false),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-2 days')`),
                or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now')`)),
            )).then((rows) => rows.map((row) => Number(row.externalId)));
    }
}
