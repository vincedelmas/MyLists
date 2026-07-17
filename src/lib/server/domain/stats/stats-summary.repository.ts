import {MediaType, sortByMediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, countDistinct, eq, inArray, SQL, sql, sum} from "drizzle-orm";
import {libraryStats, libraryTag, profileMediaChannel, user} from "@/lib/server/database/schema";


export class StatsSummaryRepository {
    static async countTags(mediaTypes: MediaType[], userId?: number) {
        if (mediaTypes.length === 0) return 0;

        const conditions: SQL[] = [inArray(libraryTag.kind, mediaTypes)];
        if (userId !== undefined) conditions.push(eq(libraryTag.userId, userId));

        const rows = await getDbClient()
            .select({
                mediaType: libraryTag.kind,
                value: countDistinct(libraryTag.name),
            }).from(libraryTag)
            .where(and(...conditions))
            .groupBy(libraryTag.kind);

        return rows.reduce((total, row) => total + row.value, 0);
    }

    static getActiveMediaSettings(userId: number) {
        return getDbClient()
            .select({
                userId: libraryStats.userId,
                mediaType: libraryStats.kind,
                totalRedo: libraryStats.totalRedo,
                active: profileMediaChannel.enabled,
                totalEntries: libraryStats.totalEntries,
                entriesRated: libraryStats.entriesRated,
                statusCounts: libraryStats.statusCounts,
                sumEntriesRated: libraryStats.ratingSum,
                timeSpent: libraryStats.timeSpentMinutes,
                totalSpecific: libraryStats.totalSpecific,
                averageRating: libraryStats.averageRating,
                entriesCommented: libraryStats.entriesCommented,
                entriesFavorites: libraryStats.entriesFavorited,
            }).from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.kind, libraryStats.kind),
                eq(profileMediaChannel.userId, libraryStats.userId),
            )).where(and(eq(libraryStats.userId, userId), eq(profileMediaChannel.enabled, true)))
            .then((rows) => sortByMediaType(rows, ({ mediaType }) => mediaType));
    }

    static async getPreComputedStatsSummary({ userId }: { userId?: number }) {
        const conditions: SQL[] = [eq(profileMediaChannel.enabled, true)];
        if (userId !== undefined) conditions.push(eq(libraryStats.userId, userId));

        const stats = getDbClient()
            .select({
                totalRedo: sum(libraryStats.totalRedo).mapWith(Number),
                distinctMediaTypes: countDistinct(libraryStats.kind),
                totalRated: sum(libraryStats.entriesRated).mapWith(Number),
                totalEntries: sum(libraryStats.totalEntries).mapWith(Number),
                totalComments: sum(libraryStats.entriesCommented).mapWith(Number),
                totalFavorites: sum(libraryStats.entriesFavorited).mapWith(Number),
                sumOfAllRatings: sum(libraryStats.ratingSum).mapWith(Number),
                totalHours: sql<number>`sum(${libraryStats.timeSpentMinutes}) / 60.0`.mapWith(Number),
            }).from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryStats.userId),
                eq(profileMediaChannel.kind, libraryStats.kind),
            )).where(and(...conditions))
            .get();

        if (!stats) throw new Error("No stats found");

        const statusCountsList = await getDbClient()
            .select({ statusCounts: libraryStats.statusCounts })
            .from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryStats.userId),
                eq(profileMediaChannel.kind, libraryStats.kind),
            )).where(and(...conditions));

        const mediaTimeDistribution = await getDbClient()
            .select({
                name: libraryStats.kind,
                value: sql<number>`sum(${libraryStats.timeSpentMinutes}) / 60.0`.mapWith(Number),
            }).from(libraryStats)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryStats.userId),
                eq(profileMediaChannel.kind, libraryStats.kind),
            ))
            .where(and(...conditions))
            .groupBy(libraryStats.kind);

        const totalUsers = userId === undefined
            ? getDbClient().select({ count: count() }).from(user).get()?.count ?? 0
            : 0;

        return {
            totalUsers,
            statusCountsList,
            mediaTimeDistribution: sortByMediaType(mediaTimeDistribution, ({ name }) => name),
            preComputedStats: {
                totalRedo: stats.totalRedo ?? 0,
                totalRated: stats.totalRated ?? 0,
                totalHours: stats.totalHours ?? 0,
                totalEntries: stats.totalEntries ?? 0,
                totalComments: stats.totalComments ?? 0,
                totalFavorites: stats.totalFavorites ?? 0,
                sumOfAllRatings: stats.sumOfAllRatings ?? 0,
                distinctMediaTypes: stats.distinctMediaTypes ?? 0,
            },
        };
    }
}
