import type {SearchType} from "@/lib/schemas";
import type {MediaType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {getDbClient} from "@/lib/server/database/async-storage";
import {dailyMediadle, mediadleStats, user, userMediadleProgress} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, gt, isNotNull, like, lt, or, sql} from "drizzle-orm";


export const mediadleRepository = {
    async getLeaderboard(mediaType: MediaType, currentUserId?: number) {
        const totalWon = sql<number>`coalesce(${mediadleStats.totalWon}, 0)`;
        const bestStreak = sql<number>`coalesce(${mediadleStats.bestStreak}, 0)`;
        const averageAttempts = sql<number>`coalesce(${mediadleStats.averageAttempts}, 0)`;

        const selection = {
            totalWon,
            bestStreak,
            averageAttempts,
            userId: user.id,
            name: user.name,
            image: user.image,
            currentStreak: sql<number>`coalesce(${mediadleStats.streak}, 0)`,
            winRate: sql<number>`CASE
                WHEN ${mediadleStats.totalPlayed} > 0
                THEN (CAST(${mediadleStats.totalWon} AS REAL) / ${mediadleStats.totalPlayed}) * 100
                ELSE 0
            END`,
        };
        const leaderboardFilter = and(
            eq(mediadleStats.mediaType, mediaType),
            gt(mediadleStats.totalPlayed, 0),
        );

        const topEntries = await getDbClient()
            .select(selection)
            .from(mediadleStats)
            .innerJoin(user, eq(mediadleStats.userId, user.id))
            .where(leaderboardFilter)
            .orderBy(desc(totalWon), desc(bestStreak), asc(averageAttempts), asc(user.name))
            .limit(10);

        const entries = topEntries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

        if (!currentUserId) return { entries, currentUserEntry: null };

        const leaderboardEntry = entries.find((entry) => entry.userId === currentUserId);
        if (leaderboardEntry) return { entries, currentUserEntry: leaderboardEntry };

        const currentUserEntry = await getDbClient()
            .select(selection)
            .from(mediadleStats)
            .innerJoin(user, eq(mediadleStats.userId, user.id))
            .where(and(leaderboardFilter, eq(user.id, currentUserId)))
            .get();

        if (!currentUserEntry) return { entries, currentUserEntry: null };

        const usersAhead = await getDbClient()
            .select({ count: count() })
            .from(mediadleStats)
            .innerJoin(user, eq(mediadleStats.userId, user.id))
            .where(and(
                leaderboardFilter,
                or(
                    gt(totalWon, currentUserEntry.totalWon),
                    and(eq(totalWon, currentUserEntry.totalWon), gt(bestStreak, currentUserEntry.bestStreak)),
                    and(
                        eq(totalWon, currentUserEntry.totalWon),
                        eq(bestStreak, currentUserEntry.bestStreak),
                        lt(averageAttempts, currentUserEntry.averageAttempts),
                    ),
                    and(
                        eq(totalWon, currentUserEntry.totalWon),
                        eq(bestStreak, currentUserEntry.bestStreak),
                        eq(averageAttempts, currentUserEntry.averageAttempts),
                        lt(user.name, currentUserEntry.name),
                    ),
                ),
            ))
            .get();

        return {
            entries,
            currentUserEntry: {
                ...currentUserEntry,
                rank: (usersAhead?.count ?? 0) + 1,
            },
        };
    },

    async getAllUsersStatsForAdmin(mediaType: MediaType, data: SearchType) {
        const search = data.search ?? "";
        const { items, total, pages } = await paginate({
            page: data.page,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(mediadleStats)
                    .innerJoin(user, eq(mediadleStats.userId, user.id))
                    .where(and(
                        eq(mediadleStats.mediaType, mediaType),
                        like(user.name, `%${search}%`),
                    ))
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        name: user.name,
                        email: user.email,
                        image: user.image,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                        ...getTableColumns(mediadleStats),
                    })
                    .from(mediadleStats)
                    .innerJoin(user, eq(mediadleStats.userId, user.id))
                    .where(and(
                        eq(mediadleStats.mediaType, mediaType),
                        like(user.name, `%${search}%`),
                    ))
                    .orderBy(desc(mediadleStats.totalPlayed))
                    .limit(limit)
                    .offset(offset);
            },
        });

        return { items, total, pages };
    },

    async getTodayMediadle(mediaType: MediaType) {
        const today = toDateInputValue(new Date(), { timeZone: "utc" });

        return getDbClient()
            .select()
            .from(dailyMediadle)
            .where(and(
                eq(dailyMediadle.mediaType, mediaType),
                sql`${dailyMediadle.date} >= ${today}`,
            ))
            .get();
    },

    async getRecentMediaIds(mediaType: MediaType) {
        return getDbClient()
            .select({ mediaId: dailyMediadle.mediaId })
            .from(dailyMediadle)
            .where(eq(dailyMediadle.mediaType, mediaType))
            .limit(200)
            .then((res) => res.map((r) => r.mediaId));
    },

    async createDailyMediadle(mediaType: MediaType, mediaId: number) {
        const [newMediadle] = await getDbClient()
            .insert(dailyMediadle)
            .values({
                mediaId,
                mediaType,
                date: toDateInputValue(new Date(), { timeZone: "utc" }),
            }).returning();

        return newMediadle;
    },

    async getUserProgress(userId: number, mediadleId: number) {
        return getDbClient()
            .select()
            .from(userMediadleProgress)
            .where(and(eq(userMediadleProgress.userId, userId), eq(userMediadleProgress.dailyMediadleId, mediadleId)))
            .get();
    },

    async createUserProgress(userId: number, mediadleId: number) {
        const [newUserProgress] = await getDbClient()
            .insert(userMediadleProgress)
            .values({
                userId,
                attempts: 0,
                succeeded: false,
                completed: false,
                dailyMediadleId: mediadleId,
            })
            .returning();

        return newUserProgress;
    },

    async getUserMediadleStats(userId: number, mediaType: MediaType) {
        return getDbClient()
            .select({
                id: mediadleStats.id,
                totalWon: mediadleStats.totalWon,
                currentStreak: mediadleStats.streak,
                bestStreak: mediadleStats.bestStreak,
                totalPlayed: mediadleStats.totalPlayed,
                averageAttempts: mediadleStats.averageAttempts,
                winRate: sql<number>`CASE 
                    WHEN ${mediadleStats.totalPlayed} > 0 
                    THEN (CAST(${mediadleStats.totalWon} AS REAL) / ${mediadleStats.totalPlayed}) * 100
                    ELSE 0
                END`,
            })
            .from(mediadleStats)
            .where(and(
                eq(mediadleStats.userId, userId),
                eq(mediadleStats.mediaType, mediaType),
            ))
            .get();
    },

    async createMediadleStats(userId: number, mediaType: MediaType) {
        const [newStats] = await getDbClient()
            .insert(mediadleStats)
            .values({
                userId,
                mediaType,
                streak: 0,
                totalWon: 0,
                bestStreak: 0,
                totalPlayed: 0,
                averageAttempts: 0,
            })
            .returning({
                id: mediadleStats.id,
                totalWon: mediadleStats.totalWon,
                currentStreak: mediadleStats.streak,
                bestStreak: mediadleStats.bestStreak,
                totalPlayed: mediadleStats.totalPlayed,
                averageAttempts: mediadleStats.averageAttempts,
                winRate: sql<number>`CASE 
                    WHEN ${mediadleStats.totalPlayed} > 0 
                    THEN (CAST(${mediadleStats.totalWon} AS REAL) / ${mediadleStats.totalPlayed}) * 100
                    ELSE 0
                END`,
            });

        return newStats;
    },

    async updateMediadleStats(statsId: number, isCompleted: boolean, isCorrect: boolean, attempts: number) {
        const [updatedStats] = await getDbClient()
            .update(mediadleStats)
            .set({
                totalPlayed: sql`CASE 
                    WHEN ${isCompleted} THEN ${mediadleStats.totalPlayed} + 1 
                    ELSE ${mediadleStats.totalPlayed} 
                END`,
                totalWon: sql`CASE 
                    WHEN ${isCorrect} THEN ${mediadleStats.totalWon} + 1 
                    ELSE ${mediadleStats.totalWon} 
                END`,
                streak: sql`CASE 
                    WHEN ${isCompleted} THEN
                        CASE 
                            WHEN ${isCorrect} THEN ${mediadleStats.streak} + 1
                            ELSE 0
                        END
                    ELSE ${mediadleStats.streak}
                END`,
                bestStreak: sql`CASE 
                    WHEN ${isCompleted} AND ${isCorrect} AND ${mediadleStats.streak} + 1 > ${mediadleStats.bestStreak} 
                    THEN ${mediadleStats.streak} + 1
                    ELSE 
                        CASE
                            WHEN ${mediadleStats.bestStreak} > ${mediadleStats.streak} THEN ${mediadleStats.bestStreak}
                            ELSE ${mediadleStats.streak}
                        END
                END`,
                averageAttempts: sql`CASE 
                    WHEN ${isCompleted} THEN
                        CASE 
                            WHEN ${mediadleStats.totalPlayed} = 0 THEN ${attempts}
                            ELSE ((${mediadleStats.averageAttempts} * ${mediadleStats.totalPlayed} + ${attempts}) / (${mediadleStats.totalPlayed} + 1))
                        END
                    ELSE ${mediadleStats.averageAttempts}
                END`,
            })
            .where(eq(mediadleStats.id, statsId))
            .returning();

        return updatedStats;
    },

    async getUserAttempts(userId: number, mediaType: MediaType) {
        return getDbClient()
            .select({
                attempts: userMediadleProgress.attempts,
                completionTime: sql<string>`strftime('%d-%m-%Y', ${userMediadleProgress.completionTime})`,
            })
            .from(userMediadleProgress)
            .innerJoin(dailyMediadle, eq(userMediadleProgress.dailyMediadleId, dailyMediadle.id))
            .where(and(
                eq(userMediadleProgress.userId, userId),
                eq(dailyMediadle.mediaType, mediaType),
                isNotNull(userMediadleProgress.completionTime),
            ))
            .orderBy(userMediadleProgress.completionTime);
    },

    async incrementUserAttempts(userId: number, mediadleId: number, isCompleted: boolean, isSucceeded: boolean) {
        const [updatedProgress] = await getDbClient()
            .update(userMediadleProgress)
            .set({
                completed: isCompleted,
                succeeded: isSucceeded,
                attempts: sql`${userMediadleProgress.attempts} + 1`,
                completionTime: isCompleted ? sql`datetime('now')` : undefined,
            })
            .where(and(
                eq(userMediadleProgress.userId, userId),
                eq(userMediadleProgress.dailyMediadleId, mediadleId),
                eq(userMediadleProgress.completed, false),
            ))
            .returning();

        return updatedProgress;
    },
};


export type MediadleRepository = typeof mediadleRepository;
