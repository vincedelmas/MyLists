import {Status} from "@/lib/utils/enums";
import {toHistogramBins} from "@/lib/utils/stats-utils";
import {and, asc, count, eq, isNotNull, ne, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {defineMediaStatistics, getMediaStatsUserScope} from "@/lib/server/domain/media/base/base.statistics";
import {MovieServerDefinition, moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";


export const createMoviesStatistics = (definition: MovieServerDefinition = moviesServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAverageDuration = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const result = getDbClient()
            .select({
                average: sql<number | null>`avg(${mediaTable.duration})`,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH), isNotNull(mediaTable.duration)))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const durationBucket = sql<number>`floor(${mediaTable.duration} / 30.0) * 30`;
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const rows = await getDbClient()
            .select({
                value: count(mediaTable.id),
                name: durationBucket.mapWith(String),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH), isNotNull(mediaTable.duration)))
            .groupBy(durationBucket)
            .orderBy(asc(durationBucket));

        return toHistogramBins(rows, (start) => start + 30);
    };

    const computeBudgetRevenue = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const data = getDbClient()
            .select({
                totalBudget: sql<number>`coalesce(sum(${mediaTable.budget}), 0)`.as("total_budget"),
                totalRevenue: sql<number>`coalesce(sum(${mediaTable.revenue}), 0)`.as("total_revenue"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH)))
            .get();

        return {
            totalBudget: data?.totalBudget ?? 0,
            totalRevenue: data?.totalRevenue ?? 0,
        };
    };

    return defineMediaStatistics({
        definition,
        calculateSpecific: async ({ queries, mediaAvgRating, userId }) => {
            const [budgetRevenue, avgDuration, durationDistrib, affinities] = await Promise.all([
                computeBudgetRevenue(userId),
                computeAverageDuration(userId),
                computeDurationDistribution(userId),
                queries.computeAffinityStats(mediaAvgRating, userId),
            ]);

            return { ...budgetRevenue, avgDuration, durationDistrib, ...affinities };
        },
    });
};


export type MoviesStatistics = ReturnType<typeof createMoviesStatistics>;
