import {
    and,
    asc,
    count,
    countDistinct,
    desc,
    eq,
    gte,
    isNotNull,
    ne,
    notInArray,
    SQL,
    sql,
    sum,
} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {Status} from "@/lib/utils/enums";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    libraryStats,
    libraryTag,
    profileMediaChannel,
    tvActor,
    tvDetails,
    tvNetwork,
    tvProgress,
    tvSeason,
    tvSeasonRewatch,
} from "@/lib/server/database/schema";


/** Reads precomputed TV aggregates from the canonical profile-channel model. */
export class TvStatsReadRepository {
    constructor(private readonly kind: TvMediaType) {}

    async getAggregatedMediaStats(scope: TvStatsReadScope) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const conditions = [
            eq(libraryStats.kind, this.kind),
            eq(profileMediaChannel.kind, this.kind),
            eq(profileMediaChannel.enabled, true),
        ];
        if (userId !== undefined) conditions.push(eq(libraryStats.userId, userId));

        const rows = await getDbClient()
            .select({
                timeSpentMinutes: libraryStats.timeSpentMinutes,
                totalEntries: libraryStats.totalEntries,
                totalRedo: libraryStats.totalRedo,
                totalRated: libraryStats.entriesRated,
                ratingSum: libraryStats.ratingSum,
                totalComments: libraryStats.entriesCommented,
                totalFavorites: libraryStats.entriesFavorited,
                totalSpecific: libraryStats.totalSpecific,
                statusCounts: libraryStats.statusCounts,
            })
            .from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryStats.userId),
                eq(profileMediaChannel.kind, libraryStats.kind),
            ))
            .where(and(...conditions));

        const totals = rows.reduce((result, row) => {
            result.timeSpentMinutes += row.timeSpentMinutes;
            result.totalEntries += row.totalEntries;
            result.totalRedo += row.totalRedo;
            result.totalRated += row.totalRated;
            result.ratingSum += row.ratingSum;
            result.totalComments += row.totalComments;
            result.totalFavorites += row.totalFavorites;
            result.totalSpecific += row.totalSpecific;
            for (const [status, value] of Object.entries(row.statusCounts)) {
                result.statusCounts[status] = (result.statusCounts[status] ?? 0) + value;
            }
            return result;
        }, {
            timeSpentMinutes: 0,
            totalEntries: 0,
            totalRedo: 0,
            totalRated: 0,
            ratingSum: 0,
            totalComments: 0,
            totalFavorites: 0,
            totalSpecific: 0,
            statusCounts: {} as Record<string, number>,
        });

        const timeSpentHours = totals.timeSpentMinutes / 60;
        return {
            statusesCounts: Object.entries(totals.statusCounts).map(([name, value]) => ({ name, value })),
            totalRedo: totals.totalRedo,
            totalRated: totals.totalRated,
            totalEntries: totals.totalEntries,
            totalComments: totals.totalComments,
            totalSpecific: totals.totalSpecific,
            timeSpentHours,
            totalFavorites: totals.totalFavorites,
            timeSpentDays: timeSpentHours / 24,
            avgRated: totals.totalRated === 0 ? null : totals.ratingSum / totals.totalRated,
        };
    }

    async getAdvancedMediaStats(scope: TvStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [ratings, totalTags, releaseDates, genresStats, totalSeasons, avgDuration, durationDistrib, actorsStats, networksStats, countriesStats] = await Promise.all([
            this.computeRatingStats(userId),
            this.computeTotalTags(userId),
            this.computeReleaseDateStats(userId),
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

    private async computeRatingStats(userId?: number) {
        const rows = await getDbClient()
            .select({ rating: libraryEntry.rating, count: count(libraryEntry.rating) })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(...this.entryConditions(userId), isNotNull(libraryEntry.rating)))
            .groupBy(libraryEntry.rating)
            .orderBy(asc(libraryEntry.rating));
        const buckets = Array.from({ length: 21 }, (_, index) => ({ name: (index * 0.5).toFixed(1), value: 0 }));
        for (const row of rows) {
            if (row.rating === null) continue;
            const index = Math.round(Number(row.rating) * 2);
            if (index >= 0 && index < buckets.length) buckets[index].value = row.count;
        }
        return buckets;
    }

    private async computeTotalTags(userId?: number) {
        const conditions = [eq(libraryTag.kind, this.kind)];
        if (userId !== undefined) conditions.push(eq(libraryTag.userId, userId));
        return getDbClient()
            .select({ value: countDistinct(libraryTag.name) })
            .from(libraryTag)
            .where(and(...conditions))
            .get()?.value ?? 0;
    }

    private computeReleaseDateStats(userId?: number) {
        const decade = sql<number>`(CAST(strftime('%Y', ${catalogItem.releaseDate}) AS INTEGER) / 10) * 10`;
        return getDbClient()
            .select({ name: decade, value: count(catalogItem.id) })
            .from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(...this.entryConditions(userId), isNotNull(catalogItem.releaseDate)))
            .groupBy(decade)
            .orderBy(asc(decade));
    }

    private async computeTotalSeasons(userId?: number) {
        return getDbClient()
            .select({ value: sum(tvProgress.currentSeason).mapWith(Number) })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.entryConditions(userId), ne(libraryEntry.status, Status.PLAN_TO_WATCH)))
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
                ...this.entryConditions(userId),
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
                ...this.entryConditions(userId),
                notInArray(libraryEntry.status, [Status.RANDOM, Status.PLAN_TO_WATCH]),
            ))
            .groupBy(bucket)
            .orderBy(asc(bucket));
    }

    private async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(catalogGenre.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(...this.entryConditions(userId), ne(libraryEntry.status, Status.PLAN_TO_WATCH)))
            .groupBy(catalogGenre.name)
            .having(gte(count(catalogGenre.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatAffinity(rows);
    }

    private async computeActorAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(tvActor.name, mediaAvgRating);
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
        return formatAffinity(rows);
    }

    private async computeNetworkAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(tvNetwork.name, mediaAvgRating);
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
        return formatAffinity(rows);
    }

    private async computeCountryAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(tvDetails.originCountry, mediaAvgRating);
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
        return formatAffinity(rows);
    }

    private entryConditions(userId?: number): SQL[] {
        const conditions: SQL[] = [eq(catalogItem.kind, this.kind)];
        if (userId !== undefined) conditions.push(eq(libraryEntry.userId, userId));
        return conditions;
    }

    private metricConditions(userId?: number): SQL[] {
        return [
            ...this.entryConditions(userId),
            notInArray(libraryEntry.status, [Status.RANDOM, Status.PLAN_TO_WATCH]),
        ];
    }
}


export type TvStatsReadScope =
    | { type: "library"; access: MediaListAccessScope }
    | { type: "platform" };


const affinityExpressions = (metricName: unknown, mediaAvgRating: number | null) => {
    const userAverage = mediaAvgRating ?? 5;
    const entriesCount = sql<number>`CAST(COUNT(${metricName}) AS FLOAT)`;
    const averageRating = sql<number>`COALESCE(AVG(${libraryEntry.rating}), ${userAverage})`;
    const favoriteCount = sql<number>`CAST(SUM(CASE WHEN ${libraryEntry.favorite} = true THEN 1 ELSE 0 END) AS FLOAT)`;
    const qualityFactor = sql`(${averageRating} / NULLIF(${userAverage}, 0))`;
    const favoriteBoost = sql`(1 + (${favoriteCount} / NULLIF(${entriesCount}, 0)))`;
    const confidence = sql`LN(${entriesCount} + 1) / 3`;
    const affinity = sql<number>`
        10 * (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) - 1) /
             (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) + 1)
    `;
    return {
        affinity,
        selection: { affinity, avgRating: averageRating, entriesCount, favoriteCount },
    };
};


const formatAffinity = (rows: Array<{
    name: string | null;
    affinity: number;
    avgRating: number;
    entriesCount: number;
    favoriteCount: number;
}>) => rows.filter((row): row is typeof row & { name: string } => row.name !== null).map((row) => ({
    name: row.name,
    value: Number(row.affinity).toFixed(2),
    metadata: {
        entriesCount: Number(row.entriesCount),
        favoriteCount: Number(row.favoriteCount),
        avgRating: Number(row.avgRating).toFixed(2),
    },
}));
