import {SearchType} from "@/lib/schemas";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {ProviderApiRollup} from "@/lib/types/admin.types";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {getDbClient} from "@/lib/server/database/async-storage";
import {paginate, resolveSorting} from "@/lib/server/database/pagination";
import {asc, count, countDistinct, desc, eq, gte, like, or, sql} from "drizzle-orm";
import {
    apiCallRollup,
    editorialCollection,
    editorialCollectionItem,
    editorialCollectionLike,
    mediaRefreshLog,
    taskHistory,
    user,
} from "@/lib/server/database/schema";


export class AdminRepository {
    static async getCollectionsOverview() {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

        const result = getDbClient()
            .select({
                total: count(editorialCollection.id).as("total"),
                uniqueOwners: countDistinct(editorialCollection.ownerId).as("uniqueOwners"),
                totalViews: sql<number>`coalesce(sum(${editorialCollection.viewCount}), 0)`.as("totalViews"),
                totalLikes: sql<number>`(select count(*) from ${editorialCollectionLike})`.as("totalLikes"),
                totalCopies: sql<number>`coalesce(sum(${editorialCollection.copiedCount}), 0)`.as("totalCopies"),
                animeCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.ANIME} then 1 else 0 end)`.as("animeCount"),
                booksCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.BOOKS} then 1 else 0 end)`.as("booksCount"),
                gamesCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.GAMES} then 1 else 0 end)`.as("gamesCount"),
                mangaCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.MANGA} then 1 else 0 end)`.as("mangaCount"),
                publicCount: sql<number>`sum(case when ${editorialCollection.visibility} = ${PrivacyType.PUBLIC} then 1 else 0 end)`.as("publicCount"),
                seriesCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.SERIES} then 1 else 0 end)`.as("seriesCount"),
                moviesCount: sql<number>`sum(case when ${editorialCollection.kind} = ${MediaType.MOVIES} then 1 else 0 end)`.as("moviesCount"),
                privateCount: sql<number>`sum(case when ${editorialCollection.visibility} = ${PrivacyType.PRIVATE} then 1 else 0 end)`.as("privateCount"),
                restrictedCount: sql<number>`sum(case when ${editorialCollection.visibility} = ${PrivacyType.RESTRICTED} then 1 else 0 end)`.as("restrictedCount"),
                createdThisMonth: sql<number>`sum(case when ${editorialCollection.createdAt} >= ${currentMonthStart} then 1 else 0 end)`.as("createdThisMonth"),
                createdPreviousMonth: sql<number>`sum(case
                    when ${editorialCollection.createdAt} >= ${previousMonthStart}
                    and ${editorialCollection.createdAt} < ${currentMonthStart}
                    then 1 else 0 end
                )`.as("createdPreviousMonth"),
            })
            .from(editorialCollection)
            .get();

        return {
            total: result?.total ?? 0,
            totalViews: result?.totalViews ?? 0,
            totalLikes: result?.totalLikes ?? 0,
            totalCopies: result?.totalCopies ?? 0,
            uniqueOwners: result?.uniqueOwners ?? 0,
            createdThisMonth: result?.createdThisMonth ?? 0,
            createdPreviousMonth: result?.createdPreviousMonth ?? 0,
            collectionsPerPrivacy: [
                { privacy: PrivacyType.PUBLIC, count: result?.publicCount ?? 0 },
                { privacy: PrivacyType.PRIVATE, count: result?.privateCount ?? 0 },
                { privacy: PrivacyType.RESTRICTED, count: result?.restrictedCount ?? 0 },
            ],
            collectionsPerMediaType: [
                { mediaType: MediaType.SERIES, count: result?.seriesCount ?? 0 },
                { mediaType: MediaType.ANIME, count: result?.animeCount ?? 0 },
                { mediaType: MediaType.MOVIES, count: result?.moviesCount ?? 0 },
                { mediaType: MediaType.GAMES, count: result?.gamesCount ?? 0 },
                { mediaType: MediaType.BOOKS, count: result?.booksCount ?? 0 },
                { mediaType: MediaType.MANGA, count: result?.mangaCount ?? 0 },
            ],
        };
    }

    static async getCollectionsCreatedPerMonth() {
        const results = getDbClient()
            .all<{ month: string; count: number }>(sql`
                SELECT 
                    COUNT(*) as count,
                    strftime('%Y-%m', ${editorialCollection.createdAt}) as month
                FROM ${editorialCollection}
                GROUP BY strftime('%Y-%m', ${editorialCollection.createdAt})
                ORDER BY month ASC
            `);

        return results.map((row) => ({
            count: Number(row.count),
            month: formatMonthYear(row.month),
        }));
    }

    static async getPaginatedCollectionsForAdmin(data: SearchType) {
        const sortDesc = data.sortDesc ?? true;
        const search = data.search?.trim() ?? "";

        const allowedSorts = ["id", "title", "createdAt", "privacy", "mediaType", "viewCount", "likeCount", "copiedCount", "ownerName"] as const;
        const sorting = resolveSorting(data.sorting, allowedSorts, "createdAt");

        const searchCondition = search
            ? or(like(editorialCollection.title, `%${search}%`), like(user.name, `%${search}%`))
            : undefined;

        const orderColumn = (() => {
            switch (sorting) {
                case "id":
                    return editorialCollection.id;
                case "title":
                    return editorialCollection.title;
                case "privacy":
                    return editorialCollection.visibility;
                case "mediaType":
                    return editorialCollection.kind;
                case "viewCount":
                    return editorialCollection.viewCount;
                case "likeCount":
                    return sql`(SELECT COUNT(*) FROM ${editorialCollectionLike} WHERE ${editorialCollectionLike.collectionId} = ${editorialCollection.id})`;
                case "copiedCount":
                    return editorialCollection.copiedCount;
                case "ownerName":
                    return user.name;
                case "createdAt":
                default:
                    return editorialCollection.createdAt;
            }
        })();

        return paginate({
            page: data.page,
            defaultPerPage: 12,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(editorialCollection)
                    .innerJoin(user, eq(user.id, editorialCollection.ownerId))
                    .where(searchCondition)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                const query = getDbClient()
                    .select({
                        ownerId: user.id,
                        ownerName: user.name,
                        ownerImage: user.image,
                        id: editorialCollection.id,
                        title: editorialCollection.title,
                        ordered: editorialCollection.ordered,
                        privacy: editorialCollection.visibility,
                        mediaType: editorialCollection.kind,
                        viewCount: editorialCollection.viewCount,
                        likeCount: sql<number>`(
                            SELECT COUNT(*) FROM ${editorialCollectionLike}
                            WHERE ${editorialCollectionLike.collectionId} = ${editorialCollection.id}
                        )`.as("likeCount"),
                        createdAt: editorialCollection.createdAt,
                        updatedAt: editorialCollection.updatedAt,
                        copiedCount: editorialCollection.copiedCount,
                        itemsCount: sql<number>`(
                            SELECT COUNT(*) FROM ${editorialCollectionItem}
                            WHERE ${editorialCollectionItem.collectionId} = ${editorialCollection.id}
                        )`.as("itemsCount"),
                    })
                    .from(editorialCollection)
                    .innerJoin(user, eq(user.id, editorialCollection.ownerId))
                    .$dynamic();

                return (searchCondition ? query.where(searchCondition) : query)
                    .orderBy(sortDesc ? desc(orderColumn) : asc(orderColumn))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async saveTaskToDb(data: SaveTaskToDb) {
        await getDbClient()
            .insert(taskHistory)
            .values({
                logs: data.logs,
                taskId: data.taskId,
                status: data.status,
                taskName: data.taskName,
                startedAt: data.startedAt,
                finishedAt: data.finishedAt,
                triggeredBy: data.triggeredBy,
                errorMessage: data.errorMessage ?? null,
                userId: "userId" in data ? data.userId : null,
            });
    }

    static async deleteArchivedTaskForAdmin(taskId: string) {
        await getDbClient()
            .delete(taskHistory)
            .where(eq(taskHistory.taskId, taskId));
    }

    static async getArchivedTasksForAdmin() {
        return getDbClient()
            .select()
            .from(taskHistory)
            .orderBy(desc(taskHistory.startedAt));
    }

    static async logMediaRefresh(params: { userId: number; mediaType: MediaType; apiId: number | string }) {
        await getDbClient()
            .insert(mediaRefreshLog)
            .values({
                userId: params.userId,
                mediaType: params.mediaType,
                apiId: String(params.apiId),
            });
    }

    static async getMediaRefreshDailyCountsByType(days?: number | null) {
        const dateFilter = this._buildMediaRefreshDateFilter(days);

        const query = getDbClient()
            .select({
                mediaType: mediaRefreshLog.mediaType,
                count: count(mediaRefreshLog.id).as("count"),
                date: sql<string>`date(${mediaRefreshLog.refreshedAt})`.as("date"),
            })
            .from(mediaRefreshLog)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(sql`date(${mediaRefreshLog.refreshedAt})`, mediaRefreshLog.mediaType)
            .orderBy(sql`date(${mediaRefreshLog.refreshedAt})`);
    }

    static async getMediaRefreshTopUsers(days: number | null) {
        const dateFilter = this._buildMediaRefreshDateFilter(days);

        const query = getDbClient()
            .select({
                name: user.name,
                role: user.role,
                userId: mediaRefreshLog.userId,
                count: count(mediaRefreshLog.id).as("count"),
            })
            .from(mediaRefreshLog)
            .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(mediaRefreshLog.userId, user.name, user.role)
            .orderBy(desc(count(mediaRefreshLog.id).as("count")))
            .limit(8);
    }

    static async getMediaRefreshTotalsByRole() {
        return getDbClient()
            .select({
                role: user.role,
                count: count(mediaRefreshLog.id).as("count"),
                userCount: countDistinct(mediaRefreshLog.userId).as("userCount"),
            })
            .from(mediaRefreshLog)
            .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
            .groupBy(user.role)
            .orderBy(desc(sql`count(${mediaRefreshLog.id})`));
    }

    static async getMediaRefreshTotalsByType() {
        return getDbClient()
            .select({
                mediaType: mediaRefreshLog.mediaType,
                count: count(mediaRefreshLog.id).as("count"),
            })
            .from(mediaRefreshLog)
            .groupBy(mediaRefreshLog.mediaType)
            .orderBy(desc(count(mediaRefreshLog.id)));
    }

    static async getMediaRefreshSummary() {
        const [summary, busiestDay] = await Promise.all([
            getDbClient()
                .select({
                    total: count(mediaRefreshLog.id).as("total"),
                    uniqueUsers: countDistinct(mediaRefreshLog.userId).as("uniqueUsers"),
                    firstRefreshDate: sql<string | null>`min(date(${mediaRefreshLog.refreshedAt}))`.as("firstRefreshDate"),
                })
                .from(mediaRefreshLog)
                .get(),
            getDbClient()
                .select({
                    count: count(mediaRefreshLog.id).as("count"),
                    date: sql<string>`date(${mediaRefreshLog.refreshedAt})`.as("date"),
                })
                .from(mediaRefreshLog)
                .groupBy(sql`date(${mediaRefreshLog.refreshedAt})`)
                .orderBy(desc(sql`count(${mediaRefreshLog.id})`), desc(sql`date(${mediaRefreshLog.refreshedAt})`))
                .limit(1)
                .get(),
        ]);

        return {
            total: Number(summary?.total ?? 0),
            busiestDay: busiestDay?.date ?? "",
            busiestCount: Number(busiestDay?.count ?? 0),
            uniqueUsers: Number(summary?.uniqueUsers ?? 0),
            firstRefreshDate: summary?.firstRefreshDate ?? null,
        };
    }

    static async getRecentMediaRefreshes(page: number) {
        return paginate({
            page,
            maxPerPage: 30,
            defaultPerPage: 12,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(mediaRefreshLog)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        name: user.name,
                        role: user.role,
                        apiId: mediaRefreshLog.apiId,
                        userId: mediaRefreshLog.userId,
                        mediaType: mediaRefreshLog.mediaType,
                        refreshedAt: mediaRefreshLog.refreshedAt,
                    })
                    .from(mediaRefreshLog)
                    .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
                    .orderBy(desc(mediaRefreshLog.refreshedAt))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async getApiCallProviders() {
        const rows = await getDbClient()
            .select({ provider: apiCallRollup.provider })
            .from(apiCallRollup)
            .groupBy(apiCallRollup.provider)
            .orderBy(apiCallRollup.provider);

        return rows.map((row) => row.provider);
    }

    static async getApiCallDailyCountsByProvider(days?: number | null) {
        const dateFilter = days
            ? gte(sql`date(${apiCallRollup.bucketStart})`, sql`date('now', ${`-${Math.max(days - 1, 0)} day`})`)
            : undefined;

        const query = getDbClient()
            .select({
                provider: apiCallRollup.provider,
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                date: sql<string>`date(${apiCallRollup.bucketStart})`.as("date"),
            })
            .from(apiCallRollup)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(sql`date(${apiCallRollup.bucketStart})`, apiCallRollup.provider)
            .orderBy(sql`date(${apiCallRollup.bucketStart})`);
    }

    static async getApiCallTotalsByProvider(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const query = getDbClient()
            .select({
                provider: apiCallRollup.provider,
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                errors: sql<number>`sum(${apiCallRollup.errors})`.as("errors"),
                avgDurationMs: sql<number>`round(sum(${apiCallRollup.durationMsTotal}) / nullif(sum(${apiCallRollup.total}), 0), 0)`.as("avgDurationMs"),
            })
            .from(apiCallRollup)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(apiCallRollup.provider)
            .orderBy(desc(sql`sum(${apiCallRollup.total})`));
    }

    static async getApiCallStatusTotals(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const rows = await getDbClient()
            .select()
            .from(apiCallRollup)
            .where(dateFilter);

        const counts = new Map<string, number>();
        for (const row of rows) {
            for (const [status, value] of Object.entries(row.statusCounts)) {
                counts.set(status, (counts.get(status) ?? 0) + Number(value));
            }
        }

        return Array.from(counts.entries())
            .map(([status, count]) => ({ status: status === "network-error" ? null : status, count }))
            .sort((a, b) => b.count - a.count);
    }

    static async getApiCallSummary(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const summaryQuery = getDbClient()
            .select({
                total: sql<number>`coalesce(sum(${apiCallRollup.total}), 0)`.as("total"),
                failed: sql<number>`coalesce(sum(${apiCallRollup.errors}), 0)`.as("failed"),
                lastCallAt: sql<string | null>`max(${apiCallRollup.bucketStart})`.as("lastCallAt"),
                firstCallAt: sql<string | null>`min(${apiCallRollup.bucketStart})`.as("firstCallAt"),
                avgDurationMs: sql<number>`round(sum(${apiCallRollup.durationMsTotal}) / nullif(sum(${apiCallRollup.total}), 0), 0)`.as("avgDurationMs"),
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestDayQuery = getDbClient()
            .select({
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                date: sql<string>`date(${apiCallRollup.bucketStart})`.as("date"),
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestSecondQuery = getDbClient()
            .select({
                count: sql<number>`max(${apiCallRollup.maxSecondBurst})`.as("count"),
                bucketStartMs: apiCallRollup.bucketStartMs,
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestMinuteQuery = getDbClient()
            .select({
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                bucketStartMs: apiCallRollup.bucketStartMs,
            })
            .from(apiCallRollup)
            .$dynamic();

        const [summary, busiestDay, busiestSecond, busiestMinute] = await Promise.all([
            (dateFilter ? summaryQuery.where(dateFilter) : summaryQuery).get(),
            (dateFilter ? busiestDayQuery.where(dateFilter) : busiestDayQuery)
                .groupBy(sql`date(${apiCallRollup.bucketStart})`)
                .orderBy(desc(sql`sum(${apiCallRollup.total})`), desc(sql`date(${apiCallRollup.bucketStart})`))
                .limit(1)
                .get(),
            (dateFilter ? busiestSecondQuery.where(dateFilter) : busiestSecondQuery)
                .groupBy(apiCallRollup.bucketStartMs)
                .orderBy(desc(sql`max(${apiCallRollup.maxSecondBurst})`))
                .limit(1)
                .get(),
            (dateFilter ? busiestMinuteQuery.where(dateFilter) : busiestMinuteQuery)
                .groupBy(apiCallRollup.bucketStartMs)
                .orderBy(desc(sql`sum(${apiCallRollup.total})`))
                .limit(1)
                .get(),
        ]);

        return {
            total: Number(summary?.total ?? 0),
            busiestDay: busiestDay?.date ?? "",
            failed: Number(summary?.failed ?? 0),
            lastCallAt: summary?.lastCallAt ?? null,
            firstCallAt: summary?.firstCallAt ?? null,
            busiestDayCount: Number(busiestDay?.count ?? 0),
            avgDurationMs: Number(summary?.avgDurationMs ?? 0),
            busiestSecondCount: Number(busiestSecond?.count ?? 0),
            busiestMinuteCount: Number(busiestMinute?.count ?? 0),
            busiestSecond: busiestSecond?.bucketStartMs ? new Date(busiestSecond.bucketStartMs).toISOString() : null,
            busiestMinute: busiestMinute?.bucketStartMs ? new Date(busiestMinute.bucketStartMs).toISOString() : null,
        };
    }

    static async getRecentApiCalls(page: number) {
        return paginate({
            page,
            maxPerPage: 30,
            defaultPerPage: 12,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(apiCallRollup)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select()
                    .from(apiCallRollup)
                    .orderBy(desc(apiCallRollup.bucketStartMs))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async upsertApiCallRollup(rollup: ProviderApiRollup) {
        await getDbClient()
            .insert(apiCallRollup)
            .values({
                total: rollup.total,
                errors: rollup.errors,
                provider: rollup.provider,
                statusCounts: rollup.statusCounts,
                bucketStartMs: rollup.bucketStartMs,
                maxSecondBurst: rollup.maxSecondBurst,
                durationMsTotal: rollup.durationMsTotal,
                bucketStart: new Date(rollup.bucketStartMs).toISOString(),
            })
            .onConflictDoUpdate({
                target: [apiCallRollup.bucketStartMs, apiCallRollup.provider],
                set: {
                    total: rollup.total,
                    errors: rollup.errors,
                    statusCounts: rollup.statusCounts,
                    maxSecondBurst: rollup.maxSecondBurst,
                    durationMsTotal: rollup.durationMsTotal,
                },
            });
    };

    private static _buildApiCallMsFilter(days?: number | null) {
        if (!days) return undefined;
        return gte(apiCallRollup.bucketStartMs, Date.now() - (Math.max(days, 1) * 24 * 60 * 60 * 1000));
    };

    private static _buildMediaRefreshDateFilter(days?: number | null) {
        if (!days) return undefined;

        const startOffset = `-${Math.max(days - 1, 0)} day`;
        return gte(sql`date(${mediaRefreshLog.refreshedAt})`, sql`date('now', ${startOffset})`);
    };
}
