import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, eq, isNotNull, ne, sql} from "drizzle-orm";
import {defineMediaStatistics} from "@/lib/server/domain/media/base/base.statistics";
import {gamesDefinition, GamesDefinition} from "@/lib/server/domain/media/games/games.definition";


export const createGamesStatistics = (definition: GamesDefinition = gamesDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAveragePlaytime = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ average: sql<number | null>`avg(${listTable.playtime} / 60)`.as("avg_playtime") })
            .from(listTable)
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_PLAY), isNotNull(listTable.playtime)))
            .get();

        return result?.average ?? null;
    };

    const computePlaytimeDistribution = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const playtimeHoursLog = sql<number>`floor(log(max(${listTable.playtime} / 60, 1)) / log(2))`;

        const distribution = await getDbClient()
            .select({
                name: playtimeHoursLog,
                value: count(mediaTable.id).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_PLAY), isNotNull(listTable.playtime)))
            .groupBy(playtimeHoursLog)
            .orderBy(asc(playtimeHoursLog));

        return distribution.map((point) => ({ name: String(Math.pow(2, point.name)), value: point.value }));
    };

    return defineMediaStatistics({
        definition,
        calculateSpecific: async ({ queries, mediaAvgRating, userId }) => {
            const [avgDuration, durationDistrib, affinities] = await Promise.all([
                computeAveragePlaytime(userId),
                computePlaytimeDistribution(userId),
                queries.computeAffinityStats(mediaAvgRating, userId),
            ]);

            return { avgDuration, durationDistrib, ...affinities };
        },
    });
};


export type GamesStatistics = ReturnType<typeof createGamesStatistics>;
