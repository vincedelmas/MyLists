import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, eq, ne, notInArray, sql} from "drizzle-orm";
import {defineMediaStatistics} from "@/lib/server/domain/media/base/base.statistics";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export const createTvStatistics = (definition: TvDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeTotalSeasons = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ totalSeasons: sql<number>`coalesce(sum(${listTable.currentSeason}), 0)` })
            .from(listTable)
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH)))
            .get();

        return result?.totalSeasons ?? 0;
    };

    const computeAverageDuration = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ average: sql<number | null>`AVG(${mediaTable.duration} * ${listTable.total})` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, notInArray(listTable.status, [Status.RANDOM, Status.PLAN_TO_WATCH])))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const durationBucket = sql<number>`floor((${mediaTable.duration} * ${mediaTable.totalEpisodes}) / 600.0) * 600`;

        return getDbClient()
            .select({
                name: sql`(${durationBucket}) / 60`.mapWith(String),
                value: count(mediaTable.id).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, notInArray(listTable.status, [Status.RANDOM, Status.PLAN_TO_WATCH])))
            .groupBy(durationBucket)
            .orderBy(asc(durationBucket));
    };

    return defineMediaStatistics({
        definition,
        calculateSpecific: async ({ queries, mediaAvgRating, userId }) => {
            const [totalSeasons, avgDuration, durationDistrib, affinities] = await Promise.all([
                computeTotalSeasons(userId),
                computeAverageDuration(userId),
                computeDurationDistribution(userId),
                queries.computeAffinityStats(mediaAvgRating, userId),
            ]);

            return { totalSeasons, avgDuration, durationDistrib, ...affinities };
        },
    });
};


export type TvStatistics = ReturnType<typeof createTvStatistics>;
