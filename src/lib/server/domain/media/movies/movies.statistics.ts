import {Status} from "@/lib/utils/enums";
import {and, asc, eq, isNotNull, ne, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {defineMediaStatistics} from "@/lib/server/domain/media/base/base.statistics";
import {MovieServerDefinition, moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";


export const createMoviesStatistics = (definition: MovieServerDefinition = moviesServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAverageDuration = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ average: sql<number | null>`avg(${mediaTable.duration})` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH), isNotNull(mediaTable.duration)))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const durationBucket = sql<number>`floor(${mediaTable.duration} / 30.0) * 30`;

        return getDbClient()
            .select({
                name: durationBucket.mapWith(String),
                value: sql`cast(count(${mediaTable.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH), isNotNull(mediaTable.duration)))
            .groupBy(durationBucket)
            .orderBy(asc(durationBucket));
    };

    const computeBudgetRevenue = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

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
