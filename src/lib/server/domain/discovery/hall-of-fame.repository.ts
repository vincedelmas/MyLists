import {HallOfFameSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {alias} from "drizzle-orm/sqlite-core";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {and, eq, gt, inArray, ne, SQL, sql} from "drizzle-orm";
import {libraryStats, profileMediaChannel, user} from "@/lib/server/database/schema";


export class HallOfFameRepository {
    static async getRankingData(filters: HallOfFameSearch, userId?: number) {
        const { search = "" } = filters;
        const mediaTypes = Object.values(MediaType);
        const sorting = resolveSorting(filters.sorting, ["normalized", "profile", ...mediaTypes] as const, "normalized");
        const { page, perPage, offset, limit } = resolvePagination({
            defaultPerPage: 10,
            page: filters.page,
            perPage: filters.perPage,
        });

        const maxTimePerMedia = getDbClient()
            .select({
                mediaType: profileMediaChannel.kind,
                maxTime: sql<number>`max(${libraryStats.timeSpentMinutes})`.as("max_time"),
            })
            .from(profileMediaChannel)
            .innerJoin(libraryStats, and(
                eq(libraryStats.userId, profileMediaChannel.userId),
                eq(libraryStats.kind, profileMediaChannel.kind),
            ))
            .where(eq(profileMediaChannel.enabled, true))
            .groupBy(profileMediaChannel.kind)
            .as("max_time_per_media");

        const channel = alias(profileMediaChannel, "hall_channel");
        const stats = alias(libraryStats, "hall_stats");

        const normalizedScoreColumns: Record<string, SQL.Aliased<number>> = {};
        for (const mediaType of mediaTypes) {
            normalizedScoreColumns[`${mediaType}Score`] = sql<number>`sum(
                CASE
                    WHEN ${channel.kind} = ${mediaType} AND ${channel.enabled} = 1 AND ${maxTimePerMedia.maxTime} > 0
                    THEN CAST(${stats.timeSpentMinutes} AS REAL) / ${maxTimePerMedia.maxTime}
                    ELSE 0
                END
            )`.as(`${mediaType}_score`);
        }

        const totalScoreExpression = mediaTypes.map((mediaType) => sql`
            CASE
                WHEN ${channel.kind} = ${mediaType} AND ${channel.enabled} = 1 AND ${maxTimePerMedia.maxTime} > 0
                THEN CAST(${stats.timeSpentMinutes} AS REAL) / ${maxTimePerMedia.maxTime}
                ELSE 0
            END
        `).reduce((accumulator, expression) => sql`${accumulator} + ${expression}`);

        const baseQuery = getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                privacy: user.privacy,
                ...normalizedScoreColumns,
                totalScore: sql<number>`sum(${totalScoreExpression})`.as("total_score"),
                totalTime: sql<number>`sum(CASE WHEN ${channel.enabled} = 1 THEN ${stats.timeSpentMinutes} ELSE 0 END)`.as("total_time"),
            })
            .from(user)
            .innerJoin(channel, eq(user.id, channel.userId))
            .innerJoin(stats, and(eq(stats.userId, channel.userId), eq(stats.kind, channel.kind)))
            .leftJoin(maxTimePerMedia, eq(channel.kind, maxTimePerMedia.mediaType))
            .where(ne(user.name, "DemoProfile"))
            .groupBy(user.id, user.name, user.image)
            .as("hall_base");

        const rankColumns: Record<string, SQL.Aliased> = {};
        for (const mediaType of mediaTypes) {
            const scoreColumn = baseQuery[`${mediaType}Score` as keyof typeof baseQuery];
            rankColumns[`${mediaType}Rank`] = sql`row_number() OVER (ORDER BY ${scoreColumn} DESC)`.as(`${mediaType}_rank`);
        }

        const allUsersRanked = getDbClient()
            .with(baseQuery)
            .select({
                id: baseQuery.id,
                name: baseQuery.name,
                image: baseQuery.image,
                privacy: baseQuery.privacy,
                ...mediaTypes.reduce((columns, mediaType) => {
                    const scoreKey = `${mediaType}Score` as keyof typeof baseQuery;
                    columns[scoreKey] = baseQuery[scoreKey];
                    return columns;
                }, {} as Record<string, typeof baseQuery[keyof typeof baseQuery]>),
                totalScore: baseQuery.totalScore,
                totalTime: baseQuery.totalTime,
                totalRank: sql<number>`row_number() OVER (ORDER BY ${baseQuery.totalScore} DESC)`.as("total_rank"),
                totalRankTime: sql<number>`row_number() OVER (ORDER BY ${baseQuery.totalTime} DESC)`.as("total_rank_time"),
                ...rankColumns,
            })
            .from(baseQuery)
            .as("all_users_ranked");

        const rankSelectionColName = sorting === "normalized"
            ? "totalRank"
            : sorting === "profile"
                ? "totalRankTime"
                : `${sorting}Rank`;
        const orderByColumn = sql`${sql.identifier(
            sorting === "normalized" ? "total_rank" : sorting === "profile" ? "total_rank_time" : `${sorting}_rank`,
        )}`;
        const searchCondition = search
            ? sql`lower(${allUsersRanked.name}) LIKE lower(${`%${search}%`})`
            : undefined;

        const finalQuery = getDbClient().with(allUsersRanked).select().from(allUsersRanked);
        if (searchCondition) finalQuery.where(searchCondition);
        const rankedUsers = await finalQuery.orderBy(orderByColumn).limit(limit).offset(offset);

        const totalQuery = getDbClient().with(allUsersRanked)
            .select({ count: sql<number>`count(*)` })
            .from(allUsersRanked);
        if (searchCondition) totalQuery.where(searchCondition);
        const total = totalQuery.get()?.count ?? 0;

        const userSettingsMap = new Map<number, { mediaType: MediaType; active: boolean; timeSpent: number }[]>();
        const rankedUserIds = rankedUsers.map(({ id }) => id);
        if (rankedUserIds.length > 0) {
            const settings = await getDbClient().select({
                userId: profileMediaChannel.userId,
                mediaType: profileMediaChannel.kind,
                active: profileMediaChannel.enabled,
                timeSpent: libraryStats.timeSpentMinutes,
            }).from(profileMediaChannel)
                .innerJoin(libraryStats, and(
                    eq(libraryStats.userId, profileMediaChannel.userId),
                    eq(libraryStats.kind, profileMediaChannel.kind),
                ))
                .where(inArray(profileMediaChannel.userId, rankedUserIds));
            for (const setting of settings) {
                const userSettings = userSettingsMap.get(setting.userId) ?? [];
                userSettings.push({
                    mediaType: setting.mediaType,
                    active: setting.active,
                    timeSpent: setting.timeSpent,
                });
                userSettingsMap.set(setting.userId, userSettings);
            }
        }

        const mediaTypeCounts = await getDbClient().select({
            mediaType: profileMediaChannel.kind,
            activeUsers: sql<number>`count(${profileMediaChannel.userId})`.mapWith(Number),
        }).from(profileMediaChannel)
            .innerJoin(libraryStats, and(
                eq(libraryStats.userId, profileMediaChannel.userId),
                eq(libraryStats.kind, profileMediaChannel.kind),
            ))
            .where(and(gt(libraryStats.timeSpentMinutes, 0), eq(profileMediaChannel.enabled, true)))
            .groupBy(profileMediaChannel.kind);
        const mediaTypeCountMap = new Map(mediaTypeCounts.map(({ mediaType, activeUsers }) => [mediaType, activeUsers]));

        let currentUserRankData: typeof rankedUsers[number] | undefined;
        let currentUserActiveSettings = new Set<MediaType>();
        if (userId) {
            currentUserRankData = getDbClient().with(allUsersRanked)
                .select().from(allUsersRanked)
                .where(eq(allUsersRanked.id, userId)).get();
            const activeSettings = await getDbClient().select({ mediaType: profileMediaChannel.kind })
                .from(profileMediaChannel)
                .where(and(
                    eq(profileMediaChannel.userId, userId),
                    eq(profileMediaChannel.enabled, true),
                ));
            currentUserActiveSettings = new Set(activeSettings.map(({ mediaType }) => mediaType));
        }

        return {
            mediaTypes,
            rankedUsers,
            userSettingsMap,
            mediaTypeCountMap,
            rankSelectionColName,
            currentUserActiveSettings,
            currentUserRankData,
            page,
            pages: Math.ceil(total / perPage),
            total,
        };
    }
}
