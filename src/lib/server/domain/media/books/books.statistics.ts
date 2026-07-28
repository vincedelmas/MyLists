import {Status} from "@/lib/utils/enums";
import {and, asc, eq, isNotNull, ne, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {defineMediaStatistics, getMediaStatsUserScope} from "@/lib/server/domain/media/base/base.statistics";
import {BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";


export const createBooksStatistics = (definition: BookServerDefinition = booksServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAverageDuration = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const result = getDbClient()
            .select({ average: sql<number | null>`avg(${mediaTable.pages})` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.pages)))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const durationBucket = sql<number>`floor(${mediaTable.pages} / 100.0) * 100`;
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        return getDbClient()
            .select({
                name: durationBucket.mapWith(String),
                value: sql`cast(count(${mediaTable.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.pages)))
            .groupBy(durationBucket)
            .orderBy(asc(durationBucket));
    };

    return defineMediaStatistics({
        definition,
        calculateSpecific: async ({ queries, mediaAvgRating, userId }) => {
            const [avgDuration, durationDistrib, affinities] = await Promise.all([
                computeAverageDuration(userId),
                computeDurationDistribution(userId),
                queries.computeAffinityStats(mediaAvgRating, userId),
            ]);

            return { avgDuration, durationDistrib, ...affinities };
        },
    });
};


export type BooksStatistics = ReturnType<typeof createBooksStatistics>;
