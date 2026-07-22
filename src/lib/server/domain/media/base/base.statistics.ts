import {Status} from "@/lib/utils/enums";
import {logger} from "@/lib/server/core/logger";
import {statusUtils} from "@/lib/utils/media-mapping";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TopAffinity, TopAffinityDefinition} from "@/lib/types/stats.types";
import {AnyMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {and, asc, count, countDistinct, desc, eq, gte, isNotNull, notInArray, sql} from "drizzle-orm";


type AffinityResults<TDefinition extends AnyMediaDefinition> = {
    [K in keyof TDefinition["statistics"]["affinity"]]: TopAffinity;
};


type DefineMediaStatisticsOptions<TDefinition extends AnyMediaDefinition, TSpecificStats extends Record<string, unknown>> = {
    definition: TDefinition;
    calculateSpecific: (context: {
        userId?: number;
        definition: TDefinition;
        mediaAvgRating: number | null;
        queries: ReturnType<typeof createMediaStatsQueries<TDefinition>>;
    }) => Promise<TSpecificStats>;
};


const createMediaStatsQueries = <const TDefinition extends AnyMediaDefinition>(definition: TDefinition) => {
    const computeTotalTags = async (userId?: number) => {
        const { tagTable } = definition.repository.tables;
        const forUser = userId ? eq(tagTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ count: countDistinct(tagTable.name) })
            .from(tagTable)
            .where(and(forUser))
            .get();

        return result?.count ?? 0;
    };

    const computeAllUsersStats = async () => {
        const { mediaType } = definition.identity;
        const { listTable, mediaTable } = definition.repository.tables;
        const { timeSpent, totalSpecific, totalRedo } = definition.statistics.allUsers;

        const expectedStatuses = statusUtils.byMediaType(mediaType) ?? [];
        const redoStat = totalRedo ?? (listTable.redo ? sql`COALESCE(SUM(${listTable.redo}), 0)` : sql`0`);

        const results = await getDbClient()
            .select({
                userId: listTable.userId,
                timeSpent: timeSpent.as("timeSpent"),
                totalSpecific: totalSpecific.as("totalSpecific"),
                statusCounts: sql`
                    COALESCE((
                        SELECT
                            JSON_GROUP_OBJECT(status, count_per_status)
                        FROM (
                            SELECT
                                status,
                                COUNT(*) as count_per_status
                            FROM ${listTable} as sub_list
                            WHERE sub_list.user_id = ${listTable.userId} GROUP BY status
                        )
                    ), '{}')
                `.as("statusCounts"),
                entriesFavorites: sql<number>`
                    COALESCE(SUM(CASE WHEN ${listTable.favorite} = 1 THEN 1 ELSE 0 END), 0)
                `.as("entriesFavorites"),
                totalRedo: redoStat.as("totalRedo"),
                entriesCommented: sql<number>`
                    COALESCE(SUM(CASE WHEN LENGTH(TRIM(COALESCE(${listTable.comment}, ''))) > 0 THEN 1 ELSE 0 END), 0)
                `.as("entriesCommented"),
                totalEntries: count(listTable.mediaId).as("totalEntries"),
                entriesRated: count(listTable.rating).as("entriesRated"),
                sumEntriesRated: sql<number>`COALESCE(SUM(${listTable.rating}), 0)`.as("sumEntriesRated"),
                averageRating: sql<number>`
                    COALESCE(SUM(${listTable.rating}) * 1.0 / NULLIF(COUNT(${listTable.rating}), 0), 0.0)
                `.as("averageRating"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .groupBy(listTable.userId);

        return results.map((row) => {
            let parsed: unknown = row.statusCounts;

            if (typeof parsed === "string") {
                try {
                    parsed = JSON.parse(parsed);
                }
                catch (err) {
                    parsed = {};
                    logger.error({ err, userId: row.userId, statusCounts: row.statusCounts }, "Failed to parse user status counts");
                }
            }

            const parsedObj = (parsed && typeof parsed === "object")
                ? parsed as Record<Status, number>
                : {} as Record<Status, number>;

            const statusCounts = expectedStatuses.reduce<Record<Status, number>>((acc, status) => {
                const value = parsedObj[status];
                acc[status] = typeof value === "number" && Number.isFinite(value) ? value : 0;
                return acc;
            }, {} as Record<Status, number>);

            return {
                statusCounts,
                userId: row.userId,
                timeSpent: Number(row.timeSpent) || 0,
                totalRedo: Number(row.totalRedo) || 0,
                totalEntries: Number(row.totalEntries) || 0,
                entriesRated: Number(row.entriesRated) || 0,
                totalSpecific: Number(row.totalSpecific) || 0,
                averageRating: Number(row.averageRating) || 0,
                sumEntriesRated: Number(row.sumEntriesRated) || 0,
                entriesFavorites: Number(row.entriesFavorites) || 0,
                entriesCommented: Number(row.entriesCommented) || 0,
            };
        });
    };

    const computeRatingStats = async (userId?: number) => {
        const { listTable } = definition.repository.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const rows = await getDbClient()
            .select({
                rating: listTable.rating,
                count: count(listTable.rating),
            })
            .from(listTable)
            .where(and(forUser, isNotNull(listTable.rating)))
            .groupBy(listTable.rating)
            .orderBy(asc(listTable.rating));

        const buckets = Array.from({ length: 21 }, (_, index) => {
            return {
                value: 0,
                name: (index * 0.5).toFixed(1),
            };
        });

        for (const row of rows) {
            if (row.rating == null) continue;
            const index = Math.round(Number(row.rating) * 2);
            if (index >= 0 && index < buckets.length) buckets[index].value = row.count;
        }

        return buckets;
    };

    const computeReleaseDateStats = async (userId?: number) => {
        const { mediaTable, listTable } = definition.repository.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const decadeExpression = sql<number>`(CAST(strftime('%Y', ${mediaTable.releaseDate}) AS INTEGER) / 10) * 10`;

        return getDbClient()
            .select({
                name: decadeExpression,
                value: sql<number>`COUNT(${mediaTable.id})`,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, isNotNull(mediaTable.releaseDate)))
            .groupBy(decadeExpression)
            .orderBy(asc(decadeExpression));
    };

    const computeTopGenresStats = async (mediaAvgRating: number | null, userId?: number) => {
        const { genreTable, listTable } = definition.repository.tables;

        const metricDefinition: TopAffinityDefinition = {
            metricTable: genreTable,
            metricNameCol: genreTable.name,
            metricIdCol: genreTable.mediaId,
            mediaLinkCol: listTable.mediaId,
            filters: [notInArray(listTable.status, [Status.PLAN_TO_WATCH, Status.PLAN_TO_PLAY, Status.PLAN_TO_READ])],
        };

        return computeTopAffinityStats(metricDefinition, mediaAvgRating, userId);
    };

    const computeAffinityStats = async (mediaAvgRating: number | null, userId?: number) => {
        const entries = await Promise.all(
            Object.entries(definition.statistics.affinity).map(async ([name, affinityDefinition]) => {
                return [name, await computeTopAffinityStats(affinityDefinition, mediaAvgRating, userId)] as const;
            }),
        );

        return Object.fromEntries(entries) as AffinityResults<TDefinition>;
    };

    const calculateCommonAdvancedStats = async (mediaAvgRating: number | null, userId?: number) => {
        const [totalTags, ratings, releaseDates, genresStats] = await Promise.all([
            computeTotalTags(userId),
            computeRatingStats(userId),
            computeReleaseDateStats(userId),
            computeTopGenresStats(mediaAvgRating, userId),
        ]);

        return { ratings, genresStats, totalTags, releaseDates };
    };

    const computeTopAffinityStats = async (affinityDefinition: TopAffinityDefinition, mediaAvgRating: number | null, userId?: number): Promise<TopAffinity> => {
        const { mediaTable, listTable } = definition.repository.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const { metricTable, metricIdCol, metricNameCol, mediaLinkCol, filters, limit = 10, minRatingCount = 3 } = affinityDefinition;

        const userAvg = mediaAvgRating ?? 5;
        const isDifferentTable = metricTable !== mediaTable && metricTable !== listTable;

        const entriesCountSql = sql<number>`CAST(COUNT(${metricNameCol}) AS FLOAT)`;
        const avgRatingSql = sql<number>`COALESCE(AVG(${listTable.rating}), ${userAvg})`;
        const favoriteCountSql = sql<number>`CAST(SUM(CASE WHEN ${listTable.favorite} = true THEN 1 ELSE 0 END) AS FLOAT)`;
        const qualityFactor = sql`(${avgRatingSql} / NULLIF(${userAvg}, 0))`;
        const favoriteBoost = sql`(1 + (${favoriteCountSql} / NULLIF(${entriesCountSql}, 0)))`;
        const confidence = sql`LN(${entriesCountSql} + 1) / 3`;
        const affinityExpr = sql<number>`
            10 * (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) - 1) /
                 (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) + 1)
            `;

        let builder = getDbClient()
            .select({
                affinity: affinityExpr,
                avgRating: avgRatingSql,
                entriesCount: entriesCountSql,
                favoriteCount: favoriteCountSql,
                name: sql<string>`${metricNameCol}`,
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .$dynamic();

        if (isDifferentTable) {
            builder = builder.innerJoin(metricTable, eq(mediaLinkCol, metricIdCol));
        }

        const results = await builder
            .where(and(forUser, isNotNull(metricNameCol), ...filters))
            .groupBy(metricNameCol)
            .having(gte(sql`COUNT(${metricNameCol})`, minRatingCount))
            .orderBy(desc(affinityExpr))
            .limit(limit);

        return results.map((row) => ({
            name: row.name,
            value: Number(row.affinity).toFixed(2),
            metadata: {
                entriesCount: Number(row.entriesCount),
                favoriteCount: Number(row.favoriteCount),
                avgRating: Number(row.avgRating).toFixed(2),
            },
        }));
    };

    return {
        computeTotalTags,
        computeAffinityStats,
        computeAllUsersStats,
        calculateCommonAdvancedStats,
    };
};


export const defineMediaStatistics = <
    const TDefinition extends AnyMediaDefinition,
    TSpecificStats extends Record<string, unknown>,
>({ definition, calculateSpecific }: DefineMediaStatisticsOptions<TDefinition, TSpecificStats>) => {
    const queries = createMediaStatsQueries(definition);

    async function calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        const [common, specific] = await Promise.all([
            queries.calculateCommonAdvancedStats(mediaAvgRating, userId),
            calculateSpecific({ definition, queries, mediaAvgRating, userId }),
        ]);

        return { ...common, ...specific };
    }

    return {
        calculateAdvancedMediaStats,
        computeTotalTags: queries.computeTotalTags,
        computeAllUsersStats: queries.computeAllUsersStats,
    };
};
