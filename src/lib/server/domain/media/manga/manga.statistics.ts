import {Status} from "@/lib/utils/enums";
import {and, asc, eq, isNotNull, ne, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {defineMediaStatistics} from "@/lib/server/domain/media/base/base.statistics";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export const createMangaStatistics = (definition: MangaServerDefinition = mangaServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAverageDuration = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ average: sql<number | null>`avg(${mediaTable.chapters})` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.chapters)))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const durationBucket = sql<number>`floor(${mediaTable.chapters} / 50.0) * 50`;

        return getDbClient()
            .select({
                name: durationBucket.mapWith(String),
                value: sql`cast(count(${mediaTable.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.chapters)))
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


export type MangaStatistics = ReturnType<typeof createMangaStatistics>;
