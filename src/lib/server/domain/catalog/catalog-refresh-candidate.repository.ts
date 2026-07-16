import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, mangaDetails, tvDetails} from "@/lib/server/database/schema";
import {and, eq, gte, inArray, isNotNull, isNull, lte, or, sql} from "drizzle-orm";


type TvKind = typeof MediaType.SERIES | typeof MediaType.ANIME;


/**
 * Catalog refresh policies. These stay as concrete family methods because
 * their provider freshness rules are deliberately different.
 */
export class CatalogRefreshCandidateRepository {
    getItemIdentity(kind: MediaType, catalogItemId: number) {
        return getDbClient()
            .select({
                apiId: catalogItem.primaryExternalId,
                lastApiUpdate: catalogItem.lastProviderUpdate,
            })
            .from(catalogItem)
            .where(and(eq(catalogItem.id, catalogItemId), eq(catalogItem.kind, kind)))
            .get();
    }

    async getTvCandidateApiIds(kind: TvKind, changedApiIds: (number | string)[]) {
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

        const rows = await getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, kind),
                eq(catalogItem.locked, false),
                changedAndStale ? or(changedAndStale, episodeHasAired) : episodeHasAired,
            )).then(rows => rows.map(row => Number(row.externalId)));

        return rows;
    }

    async getMovieCandidateApiIds() {
        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.locked, false),
                eq(catalogItem.kind, MediaType.MOVIES),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-2 days')`),
                or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now', '-6 months')`)),
            )).then(rows => rows.map(row => Number(row.externalId)))
    }

    async getGameCandidateApiIds() {
        return getDbClient()
            .select({ externalId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.locked, false),
                lte(catalogItem.lastProviderUpdate, sql`datetime('now', '-2 days')`),
                or(
                    isNull(catalogItem.releaseDate),
                    gte(catalogItem.releaseDate, sql`date('now')`),
                ),
            )).then(rows => rows.map(row => Number(row.externalId)))
    }

    async getMangaCandidateApiIds() {
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
            )).then(rows => rows.map(row => Number(row.externalId)))
    }
}
