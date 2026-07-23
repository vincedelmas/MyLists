import {alias} from "drizzle-orm/sqlite-core";
import {UpdateMonthlyActivity} from "@/lib/schemas";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {dateFromUTCInput, monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {LogMonthlyActivity, PaginatedMonthlyActivityFilter} from "@/lib/types/activity.types";
import {user, userMediaMonthlyActivity, userMediaSettings} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, gt, gte, inArray, isNull, lte, ne, or, SQL, sql, sum} from "drizzle-orm";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_ACTIVITY_THRESHOLD = 200;


export class UserMonthlyActivityRepository {
    static async addContribution(activity: LogMonthlyActivity) {
        const date = activity.activityDate ? dateFromUTCInput(activity.activityDate) : new Date();

        const { activityDate: _activityDate, ...contribution } = activity;
        const monthBucket = monthBucketFromDateInput(date);
        const newActivity = {
            ...contribution,
            monthBucket,
            lastActivityAt: date.toISOString(),
        };

        if (newActivity.progressGained <= 0 && !newActivity.hadCompletion && newActivity.redoGained <= 0) return;

        await getDbClient()
            .insert(userMediaMonthlyActivity)
            .values(newActivity)
            .onConflictDoUpdate({
                target: [
                    userMediaMonthlyActivity.userId,
                    userMediaMonthlyActivity.mediaId,
                    userMediaMonthlyActivity.mediaType,
                    userMediaMonthlyActivity.monthBucket,
                ],
                set: {
                    hidden: sql`${userMediaMonthlyActivity.hidden} AND excluded.hidden`,
                    redoGained: sql`${userMediaMonthlyActivity.redoGained} + excluded.redo_gained`,
                    hadCompletion: sql`${userMediaMonthlyActivity.hadCompletion} OR excluded.had_completion`,
                    progressGained: sql`${userMediaMonthlyActivity.progressGained} + excluded.progress_gained`,
                    lastActivityAt: sql`MAX(${userMediaMonthlyActivity.lastActivityAt}, excluded.last_activity_at)`,
                },
            });
    }

    static async getMonthlyStatsContributions(userId: number, mediaTypes: MediaType[], timeBucket: string) {
        return getDbClient()
            .select({
                mediaId: userMediaMonthlyActivity.mediaId,
                mediaType: userMediaMonthlyActivity.mediaType,
                progressGained: userMediaMonthlyActivity.progressGained,
            })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(
                eq(userMediaMonthlyActivity.userId, userId),
                gt(userMediaMonthlyActivity.progressGained, 0),
                eq(userMediaMonthlyActivity.monthBucket, timeBucket),
                inArray(userMediaMonthlyActivity.mediaType, mediaTypes),
                eq(userMediaMonthlyActivity.hidden, false),
            ))
            .orderBy(asc(userMediaMonthlyActivity.lastActivityAt));
    }

    static async getProgressStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startMonth: string, excludeBulkImports?: boolean }) {
        const conditions: SQL[] = [
            eq(userMediaMonthlyActivity.hidden, false),
            gt(userMediaMonthlyActivity.progressGained, 0),
            gte(userMediaMonthlyActivity.monthBucket, filters.startMonth),
            sql`strftime('%Y-%m', ${userMediaMonthlyActivity.monthBucket} || '-01') = ${userMediaMonthlyActivity.monthBucket}`,
        ];
        if (filters.userId) conditions.push(eq(userMediaMonthlyActivity.userId, filters.userId));
        if (filters.mediaType) conditions.push(eq(userMediaMonthlyActivity.mediaType, filters.mediaType));

        const query = getDbClient()
            .select({
                mediaId: userMediaMonthlyActivity.mediaId,
                mediaType: userMediaMonthlyActivity.mediaType,
                monthBucket: userMediaMonthlyActivity.monthBucket,
                progressGained: sum(userMediaMonthlyActivity.progressGained).mapWith(Number),
            })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .$dynamic();

        if (filters.excludeBulkImports) {
            const likelyBulkMonths = this._likelyBulkImportUserMonths();
            query.leftJoin(likelyBulkMonths, and(
                eq(userMediaMonthlyActivity.userId, likelyBulkMonths.userId),
                eq(userMediaMonthlyActivity.monthBucket, likelyBulkMonths.monthBucket),
            ));
            conditions.push(isNull(likelyBulkMonths.userId));
        }

        return query
            .where(and(...conditions))
            .groupBy(userMediaMonthlyActivity.monthBucket, userMediaMonthlyActivity.mediaType, userMediaMonthlyActivity.mediaId)
            .orderBy(asc(userMediaMonthlyActivity.monthBucket), asc(userMediaMonthlyActivity.mediaType));
    }

    static async getMonthlyMediaTypes(userId: number, timeBucket: string, hiddenOnly = false) {
        const rows = await getDbClient()
            .selectDistinct({ mediaType: userMediaMonthlyActivity.mediaType })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(
                eq(userMediaMonthlyActivity.userId, userId),
                eq(userMediaMonthlyActivity.monthBucket, timeBucket),
                eq(userMediaMonthlyActivity.hidden, hiddenOnly),
            ))
            .orderBy(asc(userMediaMonthlyActivity.mediaType));

        return rows.map((row) => row.mediaType);
    }

    static async getPaginatedMonthlyActivities(userId: number, filters: PaginatedMonthlyActivityFilter) {
        const pagination = resolvePagination({ page: filters.page, perPage: filters.perPage, defaultPerPage: 48, maxPerPage: 48 });

        const conditions: SQL[] = [
            eq(userMediaMonthlyActivity.userId, userId),
            eq(userMediaMonthlyActivity.monthBucket, filters.timeBucket),
            eq(userMediaMonthlyActivity.hidden, filters.hiddenOnly === true),
        ];

        if (filters.mediaType) {
            conditions.push(eq(userMediaMonthlyActivity.mediaType, filters.mediaType));
        }

        if (filters.activityKind && filters.activityKind !== ActivityKind.ALL) {
            if (filters.activityKind === ActivityKind.REDO) {
                conditions.push(gt(userMediaMonthlyActivity.redoGained, 0));
            }
            else if (filters.activityKind === ActivityKind.COMPLETED) {
                conditions.push(eq(userMediaMonthlyActivity.hadCompletion, true));
            }
            else if (filters.activityKind === ActivityKind.PROGRESSED) {
                conditions.push(gt(userMediaMonthlyActivity.progressGained, 0));
            }
        }

        if (filters.mediaIdsByType) {
            const searchConditions = Object.entries(filters.mediaIdsByType)
                .filter(([_, ids]) => ids.length > 0)
                .map(([mediaType, ids]) => and(
                    inArray(userMediaMonthlyActivity.mediaId, ids),
                    eq(userMediaMonthlyActivity.mediaType, mediaType as MediaType),
                ))
                .filter((condition): condition is SQL => !!condition);

            if (searchConditions.length === 0) {
                return { items: [], total: 0, page: pagination.page, pages: 0, perPage: pagination.perPage };
            }

            conditions.push(or(...searchConditions)!);
        }

        const total = getDbClient()
            .select({ count: count() })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(...conditions))
            .get()?.count ?? 0;

        const items = await getDbClient()
            .select({ ...getTableColumns(userMediaMonthlyActivity) })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(...conditions))
            .orderBy(desc(userMediaMonthlyActivity.lastActivityAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        return {
            items,
            total,
            page: pagination.page,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
        };
    }

    static async updateMonthlyActivity(userId: number, activityId: number, payload: UpdateMonthlyActivity) {
        const [existing] = await getDbClient()
            .select()
            .from(userMediaMonthlyActivity)
            .where(and(eq(userMediaMonthlyActivity.id, activityId), eq(userMediaMonthlyActivity.userId, userId)));

        if (!existing) return null;

        let newMonthBucket = existing.monthBucket;
        if (payload.lastActivityAt) {
            newMonthBucket = monthBucketFromDateInput(payload.lastActivityAt);
        }

        if (newMonthBucket !== existing.monthBucket) {
            const { id: _existingId, ...existingWithoutId } = existing;
            const movedProgressGained = payload.progressGained ?? existing.progressGained;
            const movedRedoGained = payload.redoGained ?? existing.redoGained;
            const movedHadCompletion = payload.hadCompletion ?? existing.hadCompletion;

            const [upserted] = await getDbClient()
                .insert(userMediaMonthlyActivity)
                .values({
                    ...existingWithoutId,
                    ...payload,
                    monthBucket: newMonthBucket,
                })
                .onConflictDoUpdate({
                    target: [
                        userMediaMonthlyActivity.userId,
                        userMediaMonthlyActivity.mediaId,
                        userMediaMonthlyActivity.mediaType,
                        userMediaMonthlyActivity.monthBucket,
                    ],
                    set: {
                        lastActivityAt: sql`MAX(${userMediaMonthlyActivity.lastActivityAt}, ${payload.lastActivityAt ?? existing.lastActivityAt})`,
                        hadCompletion: sql`${userMediaMonthlyActivity.hadCompletion} OR ${movedHadCompletion}`,
                        redoGained: sql`${userMediaMonthlyActivity.redoGained} + ${movedRedoGained}`,
                        progressGained: sql`${userMediaMonthlyActivity.progressGained} + ${movedProgressGained}`,
                        hidden: sql`${userMediaMonthlyActivity.hidden} AND ${payload.hidden ?? existing.hidden}`,
                    },
                })
                .returning();

            await getDbClient()
                .delete(userMediaMonthlyActivity)
                .where(eq(userMediaMonthlyActivity.id, activityId));

            return upserted;
        }

        const [updated] = await getDbClient()
            .update(userMediaMonthlyActivity)
            .set(payload)
            .where(and(eq(userMediaMonthlyActivity.id, activityId), eq(userMediaMonthlyActivity.userId, userId)))
            .returning();

        return updated;
    }

    static async removeFromMonth(userId: number, activityId: number) {
        await getDbClient()
            .delete(userMediaMonthlyActivity)
            .where(and(eq(userMediaMonthlyActivity.id, activityId), eq(userMediaMonthlyActivity.userId, userId)));
    }

    static async bulkHideMonthlyActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
        const conditions = [];
        if (filters.mediaType) conditions.push(eq(userMediaMonthlyActivity.mediaType, filters.mediaType));

        const updated = await getDbClient()
            .update(userMediaMonthlyActivity)
            .set({ hidden: true })
            .where(and(
                eq(userMediaMonthlyActivity.userId, userId),
                ne(userMediaMonthlyActivity.hidden, true),
                lte(userMediaMonthlyActivity.lastActivityAt, filters.endDate),
                gte(userMediaMonthlyActivity.lastActivityAt, filters.startDate),
                ...conditions,
            ))
            .returning({ id: userMediaMonthlyActivity.id });

        return { count: updated.length };
    }

    static async deleteAssociatedActivities(userId: number, mediaType: MediaType, mediaId: number) {
        await getDbClient()
            .delete(userMediaMonthlyActivity)
            .where(and(
                eq(userMediaMonthlyActivity.userId, userId),
                eq(userMediaMonthlyActivity.mediaId, mediaId),
                eq(userMediaMonthlyActivity.mediaType, mediaType),
            ));
    }

    private static _likelyBulkImportUserMonths() {
        const bulkActivity = alias(userMediaMonthlyActivity, "bulk_activity");

        return getDbClient()
            .select({
                userId: bulkActivity.userId,
                monthBucket: bulkActivity.monthBucket,
            })
            .from(bulkActivity)
            .innerJoin(user, eq(user.id, bulkActivity.userId))
            .where(and(
                eq(bulkActivity.hidden, false),
                gt(bulkActivity.progressGained, 0),
                gte(bulkActivity.monthBucket, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                sql`${bulkActivity.monthBucket} < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
            ))
            .groupBy(bulkActivity.userId, bulkActivity.monthBucket)
            .having(gt(count(), BULK_IMPORT_ACTIVITY_THRESHOLD))
            .as("likely_bulk_months");
    }
}
