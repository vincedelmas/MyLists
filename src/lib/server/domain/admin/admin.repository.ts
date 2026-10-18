import {SearchType} from "@/lib/schemas";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {ProviderApiRollup} from "@/lib/types/admin.types";
import {dynamicLists} from "@/lib/server/database/schema";
import {formatMonthYear} from "@/lib/utils/formatting/date";
import {getDbClient} from "@/lib/server/database/async-storage";
import {YearRecapReleaseMode} from "@/lib/types/year-recap.types";
import type {AdminMissingCoverMedia} from "@/lib/types/admin.types";
import type {AdminMissingCoversSearch} from "@/lib/schemas/admin.schema";
import {paginate, resolveSorting} from "@/lib/server/database/pagination";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {and, asc, count, countDistinct, desc, eq, gte, like, lt, lte, or, sql} from "drizzle-orm";
import {getCollectionMediaTypesSelection} from "@/lib/server/domain/collections/collections.queries";
import {apiCallRollup, collectionItems, collections, mediaRefreshLog, taskHistory, user, yearRecapRelease} from "@/lib/server/database/schema";


export class AdminRepository {
    static async getMissingCovers({ mediaType, search, ...pagination }: AdminMissingCoversSearch) {
        const mediaTypes = mediaType ? [mediaType] : ALL_MEDIA_TYPES;

        const queries = mediaTypes.map(mt => {
            const { mediaTable } = getServerMediaDefinition(mt).repository.tables;

            const where = and(
                eq(mediaTable.imageCover, "default.jpg"), search
                    ? like(mediaTable.name, `%${search}%`)
                    : undefined
            );

            return sql`select
                ${mediaTable.id} as mediaId,
                ${mt} as mediaType,
                ${mediaTable.name} as name,
                ${mediaTable.releaseDate} as releaseDate
                from ${mediaTable} where ${where}`;
        });

        const missing = sql.join(queries, sql` union all `);

        return paginate({
            ...pagination,
            getTotal: () => getDbClient().all<{ total: number }>(sql`select count(*) as total from (${missing})`)[0].total,
            getItems: async ({ limit, offset }) => getDbClient().all<AdminMissingCoverMedia>(sql`
                select * from (${missing}) order by name collate nocase, mediaType, mediaId limit ${limit} offset ${offset}
            `),
        });
    }

    static hasMissingCover(mediaType: MediaType, mediaId: number) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        return !!getDbClient()
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.imageCover, "default.jpg")))
            .get();
    }

    static updateMissingCover(mediaType: MediaType, mediaId: number, imageCover: string) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        return getDbClient()
            .update(mediaTable)
            .set({ imageCover })
            .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.imageCover, "default.jpg")))
            .returning({ id: mediaTable.id })
            .get();
    }

    static async getUserMediaAddedAndUpdatedForAdmin(mediaType: MediaType) {
        const { listTable } = getServerMediaDefinition(mediaType).repository.tables;

        const [addedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(gte(listTable.addedAt, sql`date('now', 'start of month')`));

        const [addedLastMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(and(
                gte(listTable.addedAt, sql`date('now', '-1 month', 'start of month')`),
                lt(listTable.addedAt, sql`date('now', 'start of month')`)
            ));

        const [updatedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.mediaId) })
            .from(listTable)
            .where(gte(listTable.lastUpdated, sql`date('now', 'start of month')`));

        return {
            added: {
                thisMonth: addedThisMonth?.count || 0,
                lastMonth: addedLastMonth?.count || 0,
                comparedToLastMonth: (addedThisMonth?.count || 0) - (addedLastMonth?.count || 0),
            },
            updated: {
                thisMonth: updatedThisMonth?.count || 0,
            }
        };
    }

    static async getYearRecapReleaseMode(year: number): Promise<YearRecapReleaseMode> {
        return getDbClient()
            .select({ mode: yearRecapRelease.mode })
            .from(yearRecapRelease)
            .where(eq(yearRecapRelease.year, year))
            .get()?.mode ?? "automatic";
    }

    static async getYearRecapReleaseModes(startYear: number, endYear: number) {
        return getDbClient()
            .select({
                year: yearRecapRelease.year,
                mode: yearRecapRelease.mode,
            }).from(yearRecapRelease)
            .where(and(lte(yearRecapRelease.year, endYear), gte(yearRecapRelease.year, startYear)));
    }

    static async updateYearRecapReleaseMode(year: number, mode: YearRecapReleaseMode) {
        await getDbClient()
            .insert(yearRecapRelease)
            .values({
                year,
                mode,
                updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
                target: yearRecapRelease.year,
                set: {
                    mode,
                    updatedAt: new Date().toISOString(),
                },
            });
    }

    static async getCollectionsOverview() {
        const currentMonthStart = sql`datetime('now', 'start of month')`;
        const previousMonthStart = sql`datetime('now', '-1 month', 'start of month')`;

        const result = getDbClient()
            .select({
                total: count(collections.id).as("total"),
                uniqueOwners: countDistinct(collections.ownerId).as("uniqueOwners"),
                totalViews: sql<number>`coalesce(sum(${collections.viewCount}), 0)`.as("totalViews"),
                totalLikes: sql<number>`coalesce(sum(${collections.likeCount}), 0)`.as("totalLikes"),
                totalCopies: sql<number>`coalesce(sum(${collections.copiedCount}), 0)`.as("totalCopies"),
                publicCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.PUBLIC} then 1 else 0 end)`.as("publicCount"),
                privateCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.PRIVATE} then 1 else 0 end)`.as("privateCount"),
                restrictedCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.RESTRICTED} then 1 else 0 end)`.as("restrictedCount"),
                createdThisMonth: sql<number>`sum(case when ${collections.createdAt} >= ${currentMonthStart} then 1 else 0 end)`.as("createdThisMonth"),
                createdPreviousMonth: sql<number>`sum(case
                    when ${collections.createdAt} >= ${previousMonthStart}
                    and ${collections.createdAt} < ${currentMonthStart}
                    then 1 else 0 end
                )`.as("createdPreviousMonth"),
            })
            .from(collections)
            .get();

        const mediaCounts = getDbClient()
            .select({
                mediaType: collectionItems.mediaType,
                count: countDistinct(collectionItems.collectionId),
            })
            .from(collectionItems)
            .groupBy(collectionItems.mediaType)
            .all();

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
            collectionsPerMediaType: ALL_MEDIA_TYPES.map(mediaType => ({
                mediaType,
                count: mediaCounts.find(entry => entry.mediaType === mediaType)?.count ?? 0,
            })),
        };
    }

    static async getListsCreatedPerMonth() {
        const results = getDbClient()
            .all<{ month: string; collections: number; dynamicLists: number }>(sql`
                SELECT 
                    month, 
                    sum(collections) as collections, 
                    sum(dynamicLists) as dynamicLists
                FROM (
                    SELECT 
                        strftime('%Y-%m', ${collections.createdAt}) as month, 
                        count(*) as collections, 
                        0 as dynamicLists
                    FROM ${collections} GROUP BY month
                    UNION ALL
                    SELECT 
                        strftime('%Y-%m', ${dynamicLists.createdAt}) as month, 
                        0 as collections, 
                        count(*) as dynamicLists
                    FROM ${dynamicLists} GROUP BY month
                ) GROUP BY month 
                ORDER BY month ASC
            `);

        return results.map((row) => ({
            collections: Number(row.collections),
            dynamicLists: Number(row.dynamicLists),
            month: formatMonthYear(row.month),
        }));
    }

    static async getDynamicListsOverview() {
        const result = getDbClient().select({
            total: count(),
            uniqueOwners: countDistinct(dynamicLists.userId),
            createdThisMonth: sql<number>`coalesce(sum(case when ${dynamicLists.createdAt} >= datetime('now', 'start of month') then 1 else 0 end), 0)`,
            createdPreviousMonth: sql<number>`coalesce(sum(case when ${dynamicLists.createdAt} >= datetime('now', '-1 month', 'start of month')
                and ${dynamicLists.createdAt} < datetime('now', 'start of month') then 1 else 0 end), 0)`,
        }).from(dynamicLists).get()!;

        const mediaCounts = getDbClient().all<{ mediaType: MediaType; count: number }>(sql`
            SELECT media.value as mediaType, count(*) as count
            FROM ${dynamicLists}, json_each(case
                when json_extract(${dynamicLists.spec}, '$.mediaTypes') = 'all' then ${JSON.stringify(ALL_MEDIA_TYPES)}
                else json_extract(${dynamicLists.spec}, '$.mediaTypes') end) media
            GROUP BY media.value
        `);

        return {
            ...result,
            perMediaType: ALL_MEDIA_TYPES.map(mt => ({ mediaType: mt, count: mediaCounts.find(e => e.mediaType === mt)?.count ?? 0 })),
        };
    }

    static async getPaginatedDynamicListsForAdmin(data: SearchType) {
        const search = data.search?.trim();
        const title = sql<string>`json_extract(${dynamicLists.spec}, '$.title')`;

        const where = search
            ? or(like(title, `%${search}%`), like(user.name, `%${search}%`))
            : undefined;

        const sorting = resolveSorting(
            data.sorting,
            ["id", "title", "ownerName", "privacy", "createdAt"] as const,
            "createdAt",
        );

        const orderColumn = {
            id: dynamicLists.id,
            title,
            ownerName: user.name,
            privacy: user.privacy,
            createdAt: dynamicLists.createdAt,
        }[sorting];

        return paginate({
            page: data.page,
            defaultPerPage: 12,
            perPage: data.perPage,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(dynamicLists)
                    .innerJoin(user, eq(user.id, dynamicLists.userId))
                    .where(where)
                    .get()!.count;
            },
            getItems: async ({ limit, offset }) => {
                const rows = getDbClient()
                    .select({
                        id: dynamicLists.id,
                        ownerId: user.id,
                        ownerName: user.name,
                        ownerImage: user.image,
                        privacy: user.privacy,
                        spec: dynamicLists.spec,
                        createdAt: dynamicLists.createdAt,
                        updatedAt: dynamicLists.updatedAt,
                    }).from(dynamicLists)
                    .innerJoin(user, eq(user.id, dynamicLists.userId))
                    .where(where)
                    .orderBy(data.sortDesc === false ? asc(orderColumn) : desc(orderColumn), desc(dynamicLists.id))
                    .limit(limit)
                    .offset(offset)
                    .all();

                return rows.map(({ spec, ...row }) => ({
                    ...row,
                    ordered: false,
                    viewCount: null,
                    likeCount: null,
                    itemsCount: null,
                    copiedCount: null,
                    title: spec.title,
                    mediaTypes: spec.mediaTypes === "all" ? [...ALL_MEDIA_TYPES] : spec.mediaTypes,
                }));
            },
        });
    }

    static async getPaginatedCollectionsForAdmin(data: SearchType) {
        const sortDesc = data.sortDesc ?? true;
        const search = data.search?.trim() ?? "";

        const allowedSorts = ["id", "title", "createdAt", "privacy", "viewCount", "likeCount", "copiedCount", "ownerName"] as const;
        const sorting = resolveSorting(data.sorting, allowedSorts, "createdAt");

        const searchCondition = search
            ? or(like(collections.title, `%${search}%`), like(user.name, `%${search}%`))
            : undefined;

        const orderColumn = (() => {
            switch (sorting) {
                case "id":
                    return collections.id;
                case "title":
                    return collections.title;
                case "privacy":
                    return collections.privacy;
                case "viewCount":
                    return collections.viewCount;
                case "likeCount":
                    return collections.likeCount;
                case "copiedCount":
                    return collections.copiedCount;
                case "ownerName":
                    return user.name;
                case "createdAt":
                default:
                    return collections.createdAt;
            }
        })();

        return paginate({
            page: data.page,
            defaultPerPage: 12,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .innerJoin(user, eq(user.id, collections.ownerId))
                    .where(searchCondition)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                const query = getDbClient()
                    .select({
                        ownerId: user.id,
                        id: collections.id,
                        ownerName: user.name,
                        ownerImage: user.image,
                        title: collections.title,
                        ordered: collections.ordered,
                        privacy: collections.privacy,
                        viewCount: collections.viewCount,
                        likeCount: collections.likeCount,
                        createdAt: collections.createdAt,
                        updatedAt: collections.updatedAt,
                        copiedCount: collections.copiedCount,
                        mediaTypes: getCollectionMediaTypesSelection(),
                        itemsCount: sql<number>`(
                            SELECT COUNT(*)
                            FROM collection_items
                            WHERE collection_items.collection_id = ${collections.id}
                        )`.as("itemsCount"),
                    })
                    .from(collections)
                    .innerJoin(user, eq(user.id, collections.ownerId))
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
