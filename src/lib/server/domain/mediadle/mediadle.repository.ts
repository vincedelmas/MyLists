import {SearchType} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, desc, eq, getTableColumns, isNotNull, like, sql} from "drizzle-orm";
import {dailyMediadle, mediadleStats, user, userMediadleProgress} from "@/lib/server/database/schema";


export class MediadleRepository {
    static async getAllUsersStatsForAdmin(data: SearchType) {
        const search = data.search ?? "";
        const { items, total, pages } = await paginate({
            page: data.page,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(mediadleStats)
                    .innerJoin(user, eq(mediadleStats.userId, user.id))
                    .where(like(user.name, `%${search}%`))
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
                    .where(like(user.name, `%${search}%`))
                    .orderBy(desc(mediadleStats.totalPlayed))
                    .limit(limit)
                    .offset(offset);
            },
        });

        return { items, total, pages };
    }

    static async getTodayMoviedle() {
        const today = toDateInputValue(new Date(), { timeZone: "utc" });

        return getDbClient()
            .select()
            .from(dailyMediadle)
            .where(sql`${dailyMediadle.date} >= ${today}`)
            .get();
    }

    static async getUsedMovieIds(limit: number) {
        return getDbClient()
            .select({ mediaId: dailyMediadle.mediaId })
            .from(dailyMediadle)
            .where(eq(dailyMediadle.mediaType, MediaType.MOVIES))
            .limit(limit)
            .then((res) => res.map((r) => r.mediaId));
    }

    static async createDailyMoviedle(mediaId: number) {
        const [newMoviedle] = await getDbClient()
            .insert(dailyMediadle)
            .values({
                mediaId,
                mediaType: MediaType.MOVIES,
                date: toDateInputValue(new Date(), { timeZone: "utc" }),
            }).returning();

        return newMoviedle;
    }

    static async getUserProgress(userId: number, mediadleId: number) {
        return getDbClient()
            .select()
            .from(userMediadleProgress)
            .where(and(eq(userMediadleProgress.userId, userId), eq(userMediadleProgress.dailyMediadleId, mediadleId)))
            .get();
    }

    static async createUserProgress(userId: number, mediadleId: number) {
        const [newUserProgress] = await getDbClient()
            .insert(userMediadleProgress)
            .values({
                userId,
                attempts: 0,
                succeeded: false,
                completed: false,
                dailyMediadleId: mediadleId,
            })
            .returning()

        return newUserProgress;
    }

    static async updateUserProgress(userId: number, mediadleId: number, attempts: number, completed: boolean, succeeded: boolean) {
        const [updatedProgress] = await getDbClient()
            .update(userMediadleProgress)
            .set({
                attempts,
                completed,
                succeeded,
                completionTime: completed ? sql`datetime('now')` : undefined,
            })
            .where(and(eq(userMediadleProgress.userId, userId), eq(userMediadleProgress.dailyMediadleId, mediadleId)))
            .returning();

        return updatedProgress;
    }

    static async getUserMediadleStats(userId: number) {
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
            .where(eq(mediadleStats.userId, userId))
            .get();
    }

    static async createMediadleStats(userId: number, mediaType: MediaType) {
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
    }

    static async updateMediadleStats(statsId: number, isCompleted: boolean, isCorrect: boolean, attempts: number) {
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
    }

    static async getUserAttempts(userId: number) {
        return getDbClient()
            .select({
                attempts: userMediadleProgress.attempts,
                completionTime: sql<string>`strftime('%d-%m-%Y', ${userMediadleProgress.completionTime})`,
            })
            .from(userMediadleProgress)
            .where(and(eq(userMediadleProgress.userId, userId), isNotNull(userMediadleProgress.completionTime)))
            .orderBy(userMediadleProgress.completionTime);
    }

    static async incrementUserAttempts(userId: number, mediadleId: number, isCompleted: boolean, isSucceeded: boolean) {
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
    }
}
