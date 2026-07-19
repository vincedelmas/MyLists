import {and, asc, count, countDistinct, eq, isNotNull, SQL, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, libraryStats, libraryTag, profileMediaChannel} from "@/lib/server/database/schema";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {MediaType} from "@/lib/utils/enums";


export type LibraryStatsReadScope =
    | { type: "library"; access: MediaListAccessScope }
    | { type: "platform" };

export const getAggregatedLibraryStats = async (kind: MediaType, scope: LibraryStatsReadScope) => {
    const userId = scope.type === "library" ? scope.access.ownerId : undefined;
    const conditions = [
        eq(libraryStats.kind, kind),
        eq(profileMediaChannel.kind, kind),
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
};

export const getLibraryRatingStats = async (kind: MediaType, userId?: number) => {
    const rows = await getDbClient()
        .select({ rating: libraryEntry.rating, count: count(libraryEntry.rating) })
        .from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .where(and(...getLibraryStatsEntryConditions(kind, userId), isNotNull(libraryEntry.rating)))
        .groupBy(libraryEntry.rating)
        .orderBy(asc(libraryEntry.rating));
    const buckets = Array.from({ length: 21 }, (_, index) => ({ name: (index * 0.5).toFixed(1), value: 0 }));
    for (const row of rows) {
        if (row.rating === null) continue;
        const index = Math.round(Number(row.rating) * 2);
        if (index >= 0 && index < buckets.length) buckets[index].value = row.count;
    }
    return buckets;
};

export const getLibraryTotalTags = async (kind: MediaType, userId?: number) => {
    const conditions = [eq(libraryTag.kind, kind)];
    if (userId !== undefined) conditions.push(eq(libraryTag.userId, userId));
    return getDbClient()
        .select({ value: countDistinct(libraryTag.name) })
        .from(libraryTag)
        .where(and(...conditions))
        .get()?.value ?? 0;
};

export const getLibraryReleaseDateStats = (kind: MediaType, userId?: number) => {
    const decade = sql<number>`(CAST(strftime('%Y', ${catalogItem.releaseDate}) AS INTEGER) / 10) * 10`;
    return getDbClient()
        .select({ name: decade, value: count(catalogItem.id) })
        .from(catalogItem)
        .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
        .where(and(...getLibraryStatsEntryConditions(kind, userId), isNotNull(catalogItem.releaseDate)))
        .groupBy(decade)
        .orderBy(asc(decade));
};

export const getLibraryStatsEntryConditions = (kind: MediaType, userId?: number): SQL[] => {
    const conditions: SQL[] = [eq(catalogItem.kind, kind)];
    if (userId !== undefined) conditions.push(eq(libraryEntry.userId, userId));
    return conditions;
};

export const libraryAffinityExpressions = (metricName: unknown, mediaAvgRating: number | null) => {
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

export const formatLibraryAffinity = (rows: Array<{
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
