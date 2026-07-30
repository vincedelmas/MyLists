import {Status} from "@/lib/utils/enums";
import type {HistogramBin} from "@/lib/types/stats.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, eq, isNotNull, ne, sql} from "drizzle-orm";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {defineMediaStatistics, getMediaStatsUserScope} from "@/lib/server/domain/media/base/base.statistics";
import {gamesServerDefinition, GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";


const PLAYTIME_HOUR_BINS = [
    { start: 0, endExclusive: 1 },
    { start: 1, endExclusive: 5 },
    { start: 5, endExclusive: 10 },
    { start: 10, endExclusive: 25 },
    { start: 25, endExclusive: 50 },
    { start: 50, endExclusive: 100 },
    { start: 100, endExclusive: 250 },
    { start: 250, endExclusive: 500 },
    { start: 500, endExclusive: 1000 },
    { start: 1000, endExclusive: 2500 },
    { start: 2500, endExclusive: 5000 },
    { start: 5000, endExclusive: null },
] as const satisfies ReadonlyArray<Omit<HistogramBin, "value">>;


export const createGamesStatistics = (definition: GamesServerDefinition = gamesServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;
    const { minutesPerInputUnit } = gamesDefinition.progress.timing;

    const computeAveragePlaytime = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const result = getDbClient()
            .select({
                average: sql<number | null>`avg(${listTable.playtime} / ${minutesPerInputUnit})`,
            })
            .from(listTable)
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_PLAY), isNotNull(listTable.playtime)))
            .get();

        return result?.average ?? null;
    };

    const computePlaytimeDistribution = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);
        const playtimeHours = sql<number>`(${listTable.playtime} * 1.0 / ${minutesPerInputUnit})`;
        const playtimeBucket = sql<number>`
            CASE
                WHEN ${playtimeHours} < 1 THEN 0
                WHEN ${playtimeHours} < 5 THEN 1
                WHEN ${playtimeHours} < 10 THEN 2
                WHEN ${playtimeHours} < 25 THEN 3
                WHEN ${playtimeHours} < 50 THEN 4
                WHEN ${playtimeHours} < 100 THEN 5
                WHEN ${playtimeHours} < 250 THEN 6
                WHEN ${playtimeHours} < 500 THEN 7
                WHEN ${playtimeHours} < 1000 THEN 8
                WHEN ${playtimeHours} < 2500 THEN 9
                WHEN ${playtimeHours} < 5000 THEN 10
                ELSE 11
            END
        `;

        const distribution = await getDbClient()
            .select({
                name: playtimeBucket,
                value: count(mediaTable.id),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_PLAY), isNotNull(listTable.playtime)))
            .groupBy(playtimeBucket)
            .orderBy(asc(playtimeBucket));

        return distribution.map(({ name, value }) => ({ ...PLAYTIME_HOUR_BINS[name], value }));
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
