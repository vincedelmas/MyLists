import {and, eq, gte, inArray, isNull, lte, or, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, mangaDetails} from "@/lib/server/database/schema";


export class MangaCatalogRefreshCandidatesQuery {
    getCandidateApiIds() {
        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                eq(catalogItem.locked, false),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-6 days')`),
                or(
                    isNull(catalogItem.releaseDate),
                    gte(catalogItem.releaseDate, sql`date('now')`),
                    inArray(mangaDetails.productionStatus, ["Publishing", "On Hiatus"]),
                ),
            )).then((rows) => rows.map((row) => Number(row.externalId)));
    }
}
