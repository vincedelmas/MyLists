import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {and, asc, count, countDistinct, desc, eq, gte, isNotNull, ne, SQL, sql} from "drizzle-orm";
import {libraryStatsContributionBase, rebuildLibraryStats} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    libraryStats,
    libraryTag,
    mangaAuthor,
    mangaDetails,
    mangaProgress,
    profileMediaChannel,
} from "@/lib/server/database/schema";


/** Manga aggregate, advanced, and materialized library statistics. */
export class MangaStatsRepository {
    static async rebuild() {
        const mangaContributions = await this.getRebuildContributions();
        return rebuildLibraryStats(MediaType.MANGA, mangaContributions);
    }

    static async getAggregatedMediaStats(scope: MangaStatsReadScope) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const conditions = [
            eq(libraryStats.kind, MediaType.MANGA),
            eq(profileMediaChannel.kind, MediaType.MANGA),
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

    static async getAdvancedMediaStats(scope: MangaStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [
            ratings,
            totalTags,
            releaseDates,
            genresStats,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
        ] = await Promise.all([
            this.computeRatingStats(userId),
            this.computeTotalTags(userId),
            this.computeReleaseDateStats(userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAverageChapters(userId),
            this.computeChapterDistribution(userId),
            this.computeDetailsAffinity(mangaDetails.publisher, mediaAvgRating, userId),
            this.computeAuthorAffinity(mediaAvgRating, userId),
        ]);
        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
        };
    }

    private static getRebuildContributions() {
        const totalChapters = sql<number>`COALESCE(${mangaProgress.totalChaptersRead}, 0)`;

        return getDbClient()
            .select({
                ...libraryStatsContributionBase,
                specific: totalChapters,
                timeSpent: sql<number>`${totalChapters} * 7`,
                redo: sql<number>`COALESCE(${mangaProgress.rereadCount}, 0)`,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, MediaType.MANGA));
    }

    private static async computeRatingStats(userId?: number) {
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

    private static async computeTotalTags(userId?: number) {
        const conditions = [eq(libraryTag.kind, MediaType.MANGA)];
        if (userId !== undefined) conditions.push(eq(libraryTag.userId, userId));
        return getDbClient().select({ value: countDistinct(libraryTag.name) })
            .from(libraryTag).where(and(...conditions)).get()?.value ?? 0;
    }

    private static computeReleaseDateStats(userId?: number) {
        const decade = sql<number>`(CAST(strftime('%Y', ${catalogItem.releaseDate}) AS INTEGER) / 10) * 10`;
        return getDbClient().select({ name: decade, value: count(catalogItem.id) }).from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(...this.entryConditions(userId), isNotNull(catalogItem.releaseDate)))
            .groupBy(decade).orderBy(asc(decade));
    }

    private static async computeAverageChapters(userId?: number) {
        return getDbClient().select({ value: sql<number | null>`AVG(${mangaDetails.chapters})` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaDetails.chapters))).get()?.value ?? null;
    }

    private static computeChapterDistribution(userId?: number) {
        const bucket = sql<number>`floor(${mangaDetails.chapters} / 50.0) * 50`;
        return getDbClient().select({ name: bucket, value: count(catalogItem.id) }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaDetails.chapters)))
            .groupBy(bucket).orderBy(asc(bucket))
            .then((rows) => rows.map((row) => ({ name: String(row.name), value: row.value })));
    }

    private static async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
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

    private static async computeAuthorAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = affinityExpressions(mangaAuthor.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: mangaAuthor.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaAuthor, eq(mangaAuthor.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaAuthor.name)))
            .groupBy(mangaAuthor.name).having(gte(count(mangaAuthor.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private static async computeDetailsAffinity(
        metric: typeof mangaDetails.publisher,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = affinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatAffinity(rows);
    }

    private static entryConditions(userId?: number): SQL[] {
        const conditions: SQL[] = [eq(catalogItem.kind, MediaType.MANGA)];
        if (userId !== undefined) conditions.push(eq(libraryEntry.userId, userId));
        return conditions;
    }

    private static consumedConditions(userId?: number): SQL[] {
        return [...this.entryConditions(userId), ne(libraryEntry.status, Status.PLAN_TO_READ)];
    }
}


export type MangaStatsReadScope =
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
