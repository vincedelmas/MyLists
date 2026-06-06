import {MediaType} from "@/lib/utils/enums";
import {UpdateActivity} from "@/lib/schemas";
import {alias} from "drizzle-orm/sqlite-core";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {user, userMediaActivity} from "@/lib/server/database/schema";
import {LogActivity, PaginatedActivityFilter} from "@/lib/types/activity.types";
import {dateFromUTCInput, monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {and, asc, count, desc, eq, gt, gte, inArray, isNull, lte, ne, or, SQL, sql, sum} from "drizzle-orm";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_ACTIVITY_THRESHOLD = 200;


export class UserActivityRepository {
    static async logActivity(activity: LogActivity) {
        const date = activity.lastUpdate ? dateFromUTCInput(activity.lastUpdate) : new Date();
        
        const monthBucket = monthBucketFromDateInput(date);
        const newActivity = { ...activity, monthBucket, lastUpdate: date.toISOString() }

        if (newActivity.specificGained > 0) {
            await getDbClient()
                .insert(userMediaActivity)
                .values(newActivity)
                .onConflictDoUpdate({
                    target: [
                        userMediaActivity.userId,
                        userMediaActivity.mediaId,
                        userMediaActivity.mediaType,
                        userMediaActivity.monthBucket,
                    ],
                    set: {
                        lastUpdate: sql`excluded.last_update`,
                        isRedo: sql`${userMediaActivity.isRedo} OR excluded.is_redo`,
                        isCompleted: sql`${userMediaActivity.isCompleted} OR excluded.is_completed`,
                        specificGained: sql`${userMediaActivity.specificGained} + excluded.specific_gained`,
                        hidden: sql`${userMediaActivity.hidden} AND excluded.hidden`,
                    },
                });
        }

        if (newActivity.specificGained === 0 && (newActivity.isCompleted || newActivity.isRedo)) {
            await getDbClient()
                .update(userMediaActivity)
                .set({
                    lastUpdate: newActivity.lastUpdate,
                    isRedo: sql`${userMediaActivity.isRedo} OR ${newActivity.isRedo}`,
                    isCompleted: sql`${userMediaActivity.isCompleted} OR ${newActivity.isCompleted}`,
                })
                .where(and(
                    eq(userMediaActivity.userId, newActivity.userId),
                    eq(userMediaActivity.mediaId, newActivity.mediaId),
                    eq(userMediaActivity.mediaType, newActivity.mediaType),
                    eq(userMediaActivity.monthBucket, newActivity.monthBucket),
                ));
        }
    }

    static async getStatsActivities(userId: number, mediaTypes: MediaType[], timeBucket: string) {
        return getDbClient()
            .select({
                mediaId: userMediaActivity.mediaId,
                mediaType: userMediaActivity.mediaType,
                specificGained: userMediaActivity.specificGained,
            })
            .from(userMediaActivity)
            .where(and(
                eq(userMediaActivity.userId, userId),
                gt(userMediaActivity.specificGained, 0),
                eq(userMediaActivity.monthBucket, timeBucket),
                inArray(userMediaActivity.mediaType, mediaTypes),
                eq(userMediaActivity.hidden, false),
            ))
            .orderBy(asc(userMediaActivity.lastUpdate));
    }

    static async getActivityStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startMonth: string, excludeBulkImports?: boolean }) {
        const conditions: SQL[] = [
            eq(userMediaActivity.hidden, false),
            gt(userMediaActivity.specificGained, 0),
            gte(userMediaActivity.monthBucket, filters.startMonth),
        ];
        if (filters.userId) conditions.push(eq(userMediaActivity.userId, filters.userId));
        if (filters.mediaType) conditions.push(eq(userMediaActivity.mediaType, filters.mediaType));

        const query = getDbClient()
            .select({
                mediaId: userMediaActivity.mediaId,
                mediaType: userMediaActivity.mediaType,
                monthBucket: userMediaActivity.monthBucket,
                specificGained: sum(userMediaActivity.specificGained).mapWith(Number),
            })
            .from(userMediaActivity)
            .$dynamic();

        if (filters.excludeBulkImports) {
            const likelyBulkMonths = this._likelyBulkImportUserMonths();
            query.leftJoin(likelyBulkMonths, and(
                eq(userMediaActivity.userId, likelyBulkMonths.userId),
                eq(userMediaActivity.monthBucket, likelyBulkMonths.monthBucket),
            ));
            conditions.push(isNull(likelyBulkMonths.userId));
        }

        return query
            .where(and(...conditions))
            .groupBy(userMediaActivity.monthBucket, userMediaActivity.mediaType, userMediaActivity.mediaId)
            .orderBy(asc(userMediaActivity.monthBucket), asc(userMediaActivity.mediaType));
    }

    static async getActivityMediaTypes(userId: number, timeBucket: string, hiddenOnly = false) {
        const rows = await getDbClient()
            .selectDistinct({ mediaType: userMediaActivity.mediaType })
            .from(userMediaActivity)
            .where(and(
                eq(userMediaActivity.userId, userId),
                eq(userMediaActivity.monthBucket, timeBucket),
                eq(userMediaActivity.hidden, hiddenOnly),
            ))
            .orderBy(asc(userMediaActivity.mediaType));

        return rows.map((row) => row.mediaType);
    }

    static async getPaginatedActivities(userId: number, filters: PaginatedActivityFilter) {
        const pagination = resolvePagination({ page: filters.page, perPage: filters.perPage, defaultPerPage: 48, maxPerPage: 48 });

        const conditions: SQL[] = [
            eq(userMediaActivity.userId, userId),
            eq(userMediaActivity.monthBucket, filters.timeBucket),
            eq(userMediaActivity.hidden, filters.hiddenOnly === true),
        ];

        if (filters.mediaType) {
            conditions.push(eq(userMediaActivity.mediaType, filters.mediaType));
        }

        if (filters.activityKind && filters.activityKind !== "all") {
            if (filters.activityKind === "redo") {
                conditions.push(eq(userMediaActivity.isRedo, true));
            }
            else if (filters.activityKind === "completed") {
                conditions.push(and(
                    eq(userMediaActivity.isRedo, false),
                    eq(userMediaActivity.isCompleted, true),
                )!);
            }
            else if (filters.activityKind === "progressed") {
                conditions.push(and(
                    eq(userMediaActivity.isRedo, false),
                    gt(userMediaActivity.specificGained, 0),
                    eq(userMediaActivity.isCompleted, false),
                )!);
            }
        }

        if (filters.mediaIdsByType) {
            const searchConditions = Object.entries(filters.mediaIdsByType)
                .filter(([_, ids]) => ids.length > 0)
                .map(([mediaType, ids]) => and(
                    inArray(userMediaActivity.mediaId, ids),
                    eq(userMediaActivity.mediaType, mediaType as MediaType),
                ))
                .filter((condition): condition is SQL => !!condition);

            if (searchConditions.length === 0) {
                return { items: [], total: 0, page: pagination.page, pages: 0, perPage: pagination.perPage };
            }

            conditions.push(or(...searchConditions)!);
        }

        const total = getDbClient()
            .select({ count: count() })
            .from(userMediaActivity)
            .where(and(...conditions))
            .get()?.count ?? 0;

        const items = await getDbClient()
            .select()
            .from(userMediaActivity)
            .where(and(...conditions))
            .orderBy(desc(userMediaActivity.lastUpdate))
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

    static async updateActivity(userId: number, activityId: number, payload: UpdateActivity) {
        const [existing] = await getDbClient()
            .select()
            .from(userMediaActivity)
            .where(and(eq(userMediaActivity.id, activityId), eq(userMediaActivity.userId, userId)));

        if (!existing) return null;

        let newMonthBucket = existing.monthBucket;
        if (payload.lastUpdate) {
            newMonthBucket = monthBucketFromDateInput(payload.lastUpdate);
        }

        if (newMonthBucket !== existing.monthBucket) {
            const { id: _existingId, ...existingWithoutId } = existing;
            const movedSpecificGained = payload.specificGained ?? existing.specificGained;

            const [upserted] = await getDbClient()
                .insert(userMediaActivity)
                .values({
                    ...existingWithoutId,
                    ...payload,
                    monthBucket: newMonthBucket,
                })
                .onConflictDoUpdate({
                    target: [
                        userMediaActivity.userId,
                        userMediaActivity.mediaId,
                        userMediaActivity.mediaType,
                        userMediaActivity.monthBucket,
                    ],
                    set: {
                        isRedo: payload.isRedo ?? existing.isRedo,
                        lastUpdate: payload.lastUpdate ?? existing.lastUpdate,
                        isCompleted: payload.isCompleted ?? existing.isCompleted,
                        hidden: payload.hidden ?? existing.hidden,
                        specificGained: sql`${userMediaActivity.specificGained} + ${movedSpecificGained}`,
                    },
                })
                .returning();

            await getDbClient()
                .delete(userMediaActivity)
                .where(eq(userMediaActivity.id, activityId));

            return upserted;
        }

        const [updated] = await getDbClient()
            .update(userMediaActivity)
            .set(payload)
            .where(and(eq(userMediaActivity.id, activityId), eq(userMediaActivity.userId, userId)))
            .returning();

        return updated;
    }

    static async deleteActivity(userId: number, activityId: number) {
        await getDbClient()
            .delete(userMediaActivity)
            .where(and(eq(userMediaActivity.id, activityId), eq(userMediaActivity.userId, userId)));
    }

    static async bulkHideActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
        const conditions = [];
        if (filters.mediaType) conditions.push(eq(userMediaActivity.mediaType, filters.mediaType));

        const updated = await getDbClient()
            .update(userMediaActivity)
            .set({ hidden: true })
            .where(and(
                eq(userMediaActivity.userId, userId),
                ne(userMediaActivity.hidden, true),
                lte(userMediaActivity.lastUpdate, filters.endDate),
                gte(userMediaActivity.lastUpdate, filters.startDate),
                ...conditions,
            ))
            .returning({ id: userMediaActivity.id });

        return { count: updated.length };
    }

    static async deleteAssociatedActivities(userId: number, mediaType: MediaType, mediaId: number) {
        await getDbClient()
            .delete(userMediaActivity)
            .where(and(
                eq(userMediaActivity.userId, userId),
                eq(userMediaActivity.mediaId, mediaId),
                eq(userMediaActivity.mediaType, mediaType),
            ));
    }

    private static _likelyBulkImportUserMonths() {
        const bulkActivity = alias(userMediaActivity, "bulk_activity");

        return getDbClient()
            .select({
                userId: bulkActivity.userId,
                monthBucket: bulkActivity.monthBucket,
            })
            .from(bulkActivity)
            .innerJoin(user, eq(user.id, bulkActivity.userId))
            .where(and(
                eq(bulkActivity.hidden, false),
                gt(bulkActivity.specificGained, 0),
                gte(bulkActivity.monthBucket, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                sql`${bulkActivity.monthBucket} < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
            ))
            .groupBy(bulkActivity.userId, bulkActivity.monthBucket)
            .having(gt(count(), BULK_IMPORT_ACTIVITY_THRESHOLD))
            .as("likely_bulk_months");
    }
}
