import {Status} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, desc, eq, gte, isNotNull, ne, notInArray, SQL, sql, sum} from "drizzle-orm";
import {libraryStatsContributionBase, rebuildLibraryStats} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {
    formatLibraryAffinity,
    getAggregatedLibraryStats,
    getLibraryRatingStats,
    getLibraryReleaseDateStats,
    getLibraryStatsEntryConditions,
    getLibraryTotalTags,
    libraryAffinityExpressions,
    LibraryStatsReadScope,
} from "@/lib/server/domain/media/shared/library/library-stats-read";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    tvActor,
    tvDetails,
    tvNetwork,
    tvProgress,
    tvSeason,
    tvSeasonRewatch,
} from "@/lib/server/database/schema";


/** TV aggregate, advanced, and materialized library statistics. */
export class TvStatsRepository {
    constructor(private readonly kind: TvMediaType) {
    }

    async rebuild() {
        const tvContributions = await this.getRebuildContributions();
        return rebuildLibraryStats(this.kind, tvContributions);
    }

    async getAggregatedMediaStats(scope: TvStatsReadScope) {
        return getAggregatedLibraryStats(this.kind, scope);
    }

    async getAdvancedMediaStats(scope: TvStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [ratings, totalTags, releaseDates, genresStats, totalSeasons, avgDuration, durationDistrib, actorsStats, networksStats, countriesStats] = await Promise.all([
            getLibraryRatingStats(this.kind, userId),
            getLibraryTotalTags(this.kind, userId),
            getLibraryReleaseDateStats(this.kind, userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeTotalSeasons(userId),
            this.computeAverageConsumedDuration(userId),
            this.computeDurationDistribution(userId),
            this.computeActorAffinity(mediaAvgRating, userId),
            this.computeNetworkAffinity(mediaAvgRating, userId),
            this.computeCountryAffinity(mediaAvgRating, userId),
        ]);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            totalSeasons,
            avgDuration,
            durationDistrib,
            networksStats,
            actorsStats,
            countriesStats,
        };
    }

    private getRebuildContributions() {
        const rewatches = sql<number>`COALESCE((
            SELECT SUM(rewatch.count * season.episode_count)
            FROM tv_season_rewatch rewatch
            INNER JOIN tv_season season
                ON season.catalog_item_id = rewatch.catalog_item_id
                AND season.season_number = rewatch.season_number
            WHERE rewatch.library_entry_id = ${libraryEntry.id}
        ), 0)`;

        const watchedEpisodes = sql<number>`COALESCE(${tvProgress.watchedEpisodes}, 0) + ${rewatches}`;

        return getDbClient()
            .select({
                ...libraryStatsContributionBase,
                specific: watchedEpisodes,
                timeSpent: sql<number>`${watchedEpisodes} * COALESCE(${tvDetails.episodeDurationMinutes}, 0)`,
                redo: sql<number>`COALESCE((SELECT SUM(count) FROM tv_season_rewatch WHERE library_entry_id = ${libraryEntry.id}), 0)`,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.kind, this.kind));
    }

    private async computeTotalSeasons(userId?: number) {
        return getDbClient()
            .select({ value: sum(tvProgress.currentSeason).mapWith(Number) })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(...getLibraryStatsEntryConditions(this.kind, userId), ne(libraryEntry.status, Status.PLAN_TO_WATCH)))
            .get()?.value ?? 0;
    }

    private async computeAverageConsumedDuration(userId?: number) {
        const consumedEpisodes = sql<number>`(
            ${tvProgress.watchedEpisodes} + COALESCE((
                SELECT SUM(rewatch.count * season.episode_count)
                FROM ${tvSeasonRewatch} rewatch
                JOIN ${tvSeason} season
                    ON season.catalog_item_id = rewatch.catalog_item_id
                    AND season.season_number = rewatch.season_number
                WHERE rewatch.library_entry_id = ${libraryEntry.id}
            ), 0)
        )`;
        return getDbClient()
            .select({ value: sql<number | null>`AVG(${tvDetails.episodeDurationMinutes} * ${consumedEpisodes})` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(
                ...getLibraryStatsEntryConditions(this.kind, userId),
                notInArray(libraryEntry.status, [Status.RANDOM, Status.PLAN_TO_WATCH]),
            ))
            .get()?.value ?? null;
    }

    private computeDurationDistribution(userId?: number) {
        const bucket = sql<number>`floor((${tvDetails.episodeDurationMinutes} * ${tvDetails.totalEpisodes}) / 600.0) * 600`;
        return getDbClient()
            .select({ name: sql`${bucket} / 60`.mapWith(String), value: count(catalogItem.id) })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                ...getLibraryStatsEntryConditions(this.kind, userId),
                notInArray(libraryEntry.status, [Status.RANDOM, Status.PLAN_TO_WATCH]),
            ))
            .groupBy(bucket)
            .orderBy(asc(bucket));
    }

    private async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(catalogGenre.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(...getLibraryStatsEntryConditions(this.kind, userId), ne(libraryEntry.status, Status.PLAN_TO_WATCH)))
            .groupBy(catalogGenre.name)
            .having(gte(count(catalogGenre.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private async computeActorAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(tvActor.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: tvActor.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvActor, eq(tvActor.catalogItemId, catalogItem.id))
            .where(and(...this.metricConditions(userId), isNotNull(tvActor.name)))
            .groupBy(tvActor.name)
            .having(gte(count(tvActor.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private async computeNetworkAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(tvNetwork.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: tvNetwork.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvNetwork, eq(tvNetwork.catalogItemId, catalogItem.id))
            .where(and(...this.metricConditions(userId), isNotNull(tvNetwork.name)))
            .groupBy(tvNetwork.name)
            .having(gte(count(tvNetwork.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private async computeCountryAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(tvDetails.originCountry, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: tvDetails.originCountry })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(...this.metricConditions(userId), isNotNull(tvDetails.originCountry)))
            .groupBy(tvDetails.originCountry)
            .having(gte(count(tvDetails.originCountry), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private metricConditions(userId?: number): SQL[] {
        return [
            ...getLibraryStatsEntryConditions(this.kind, userId),
            notInArray(libraryEntry.status, [Status.RANDOM, Status.PLAN_TO_WATCH]),
        ];
    }
}


export type TvStatsReadScope = LibraryStatsReadScope;
