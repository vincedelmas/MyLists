import {and, eq, gte, isNull, lte, or, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem} from "@/lib/server/database/schema";


export class MovieCatalogRefreshCandidatesQuery {
    getCandidateApiIds() {
        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.locked, false),
                eq(catalogItem.kind, MediaType.MOVIES),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-2 days')`),
                or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now', '-6 months')`)),
            )).then((rows) => rows.map((row) => Number(row.externalId)));
    }
}
