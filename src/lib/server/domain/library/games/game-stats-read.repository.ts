import {and, asc, count, countDistinct, desc, eq, gte, isNotNull, ne, SQL, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, Status} from "@/lib/utils/enums";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gameProgress,
    libraryEntry,
    libraryStats,
    libraryTag,
    profileMediaChannel,
} from "@/lib/server/database/schema";


/** Game aggregate and advanced statistics over canonical playtime and catalog rows. */
export class GameStatsReadRepository {
    async getAggregatedMediaStats(scope: GameStatsReadScope) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const conditions = [
            eq(libraryStats.kind, MediaType.GAMES),
            eq(profileMediaChannel.kind, MediaType.GAMES),
            eq(profileMediaChannel.enabled, true),
        ];
        if (userId !== undefined) conditions.push(eq(libraryStats.userId, userId));
        const rows = await getDbClient().select({
            timeSpentMinutes: libraryStats.timeSpentMinutes,
            totalEntries: libraryStats.totalEntries,
            totalRedo: libraryStats.totalRedo,
            totalRated: libraryStats.entriesRated,
            ratingSum: libraryStats.ratingSum,
            totalComments: libraryStats.entriesCommented,
            totalFavorites: libraryStats.entriesFavorited,
            totalSpecific: libraryStats.totalSpecific,
            statusCounts: libraryStats.statusCounts,
        }).from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryStats.userId),
                eq(profileMediaChannel.kind, libraryStats.kind),
            )).where(and(...conditions));
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

    async getAdvancedMediaStats(scope: GameStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [
            ratings,
            totalTags,
            releaseDates,
            genresStats,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
        ] = await Promise.all([
            this.computeRatingStats(userId),
            this.computeTotalTags(userId),
            this.computeReleaseDateStats(userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAveragePlaytime(userId),
            this.computePlaytimeDistribution(userId),
            this.computeCompanyAffinity(true, mediaAvgRating, userId),
            this.computeCompanyAffinity(false, mediaAvgRating, userId),
            this.computeProgressAffinity(gameProgress.platform, mediaAvgRating, userId),
            this.computeDetailsAffinity(gameDetails.gameEngine, mediaAvgRating, userId),
            this.computeDetailsAffinity(gameDetails.playerPerspective, mediaAvgRating, userId),
        ]);
        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
        };
    }

    private async computeRatingStats(userId?: number) {
        const rows = await getDbClient().select({ rating: libraryEntry.rating, count: count(libraryEntry.rating) })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(...this.entryConditions(userId), isNotNull(libraryEntry.rating)))
            .groupBy(libraryEntry.rating).orderBy(asc(libraryEntry.rating));
        const buckets = Array.from({ length: 21 }, (_, index) => ({ name: (index * 0.5).toFixed(1), value: 0 }));
        for (const row of rows) {
            if (row.rating === null) continue;
            const index = Math.round(Number(row.rating) * 2);
            if (index >= 0 && index < buckets.length) buckets[index].value = row.count;
        }
        return buckets;
    }

    private async computeTotalTags(userId?: number) {
        const conditions = [eq(libraryTag.kind, MediaType.GAMES)];
        if (userId !== undefined) conditions.push(eq(libraryTag.userId, userId));
        return getDbClient().select({ value: countDistinct(libraryTag.name) })
            .from(libraryTag).where(and(...conditions)).get()?.value ?? 0;
    }

    private computeReleaseDateStats(userId?: number) {
        const decade = sql<number>`(CAST(strftime('%Y', ${catalogItem.releaseDate}) AS INTEGER) / 10) * 10`;
        return getDbClient().select({ name: decade, value: count(catalogItem.id) }).from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(...this.entryConditions(userId), isNotNull(catalogItem.releaseDate)))
            .groupBy(decade).orderBy(asc(decade));
    }

    private async computeAveragePlaytime(userId?: number) {
        return getDbClient().select({ value: sql<number | null>`AVG(${gameProgress.playtimeMinutes} / 60)` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId))).get()?.value ?? null;
    }

    private computePlaytimeDistribution(userId?: number) {
        const bucket = sql<number>`floor(log(max(${gameProgress.playtimeMinutes} / 60, 1)) / log(2))`;
        return getDbClient().select({ name: bucket, value: count(catalogItem.id) }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId)))
            .groupBy(bucket).orderBy(asc(bucket))
            .then((rows) => rows.map((row) => ({ name: String(Math.pow(2, row.name)), value: row.value })));
    }

    private async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(catalogGenre.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(...this.consumedConditions(userId), isNotNull(catalogGenre.name)))
            .groupBy(catalogGenre.name).having(gte(count(catalogGenre.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private async computeCompanyAffinity(developer: boolean, mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(gameCompany.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: gameCompany.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameCompany, eq(gameCompany.catalogItemId, catalogItem.id))
            .where(and(
                ...this.consumedConditions(userId),
                isNotNull(gameCompany.name),
                developer ? eq(gameCompany.developer, true) : eq(gameCompany.publisher, true),
            ))
            .groupBy(gameCompany.name).having(gte(count(gameCompany.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private async computeProgressAffinity(
        metric: typeof gameProgress.platform,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = affinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private async computeDetailsAffinity(
        metric: typeof gameDetails.gameEngine | typeof gameDetails.playerPerspective,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = affinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private entryConditions(userId?: number): SQL[] {
        const conditions: SQL[] = [eq(catalogItem.kind, MediaType.GAMES)];
        if (userId !== undefined) conditions.push(eq(libraryEntry.userId, userId));
        return conditions;
    }

    private consumedConditions(userId?: number): SQL[] {
        return [...this.entryConditions(userId), ne(libraryEntry.status, Status.PLAN_TO_PLAY)];
    }
}


export type GameStatsReadScope =
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
    return { affinity, selection: { affinity, avgRating: averageRating, entriesCount, favoriteCount } };
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
