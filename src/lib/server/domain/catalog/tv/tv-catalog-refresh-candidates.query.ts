import {and, eq, inArray, isNotNull, lte, or, sql} from "drizzle-orm";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, tvDetails} from "@/lib/server/database/schema";


export class TvCatalogRefreshCandidatesQuery {
    constructor(private readonly kind: TvMediaType) {}

    async getCandidateApiIds(changedApiIds: (number | string)[]) {
        const changedExternalIds = changedApiIds.map(String);
        const changedAndStale = changedExternalIds.length > 0
            ? and(
                inArray(catalogItem.primaryExternalId, changedExternalIds),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-1 day')`),
            )
            : undefined;
        const episodeHasAired = and(
            isNotNull(tvDetails.nextEpisodeAirDate),
            lte(tvDetails.nextEpisodeAirDate, sql`date('now')`),
        );

        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(catalogItem.locked, false),
                changedAndStale ? or(changedAndStale, episodeHasAired) : episodeHasAired,
            )).then((rows) => rows.map((row) => Number(row.externalId)));
    }
}
