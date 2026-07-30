import {Status} from "@/lib/utils/enums";
import {toHistogramBins} from "@/lib/utils/stats-utils";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, eq, isNotNull, ne, sql} from "drizzle-orm";
import {defineMediaStatistics, getMediaStatsUserScope} from "@/lib/server/domain/media/base/base.statistics";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export const createMangaStatistics = (definition: MangaServerDefinition = mangaServerDefinition) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const computeAverageDuration = async (userId?: number) => {
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const result = getDbClient()
            .select({
                average: sql<number | null>`avg(${mediaTable.chapters})`,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.chapters)))
            .get();

        return result?.average ?? null;
    };

    const computeDurationDistribution = async (userId?: number) => {
        const durationBucket = sql<number>`floor(${mediaTable.chapters} / 50.0) * 50`;
        const forUser = getMediaStatsUserScope(listTable.userId, definition.identity.mediaType, userId);

        const rows = await getDbClient()
            .select({
                value: count(mediaTable.id),
                name: durationBucket.mapWith(String),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_READ), isNotNull(mediaTable.chapters)))
            .groupBy(durationBucket)
            .orderBy(asc(durationBucket));

        return toHistogramBins(rows, (start) => start + 50);
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
