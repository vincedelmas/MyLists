import {and, asc, count, desc, eq, gt, gte, inArray, isNull, SQL, sql, sum} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {ActivityKind} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {PaginatedActivityFilter} from "@/lib/types/activity.types";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {
    libraryActivity,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_ACTIVITY_THRESHOLD = 200;
const mediaId = sql<number>`${libraryActivity.catalogItemId}`;


/** Projects TV activity into the activity editor contract. */
export class TvActivityReadRepository {
    constructor(private readonly kind: TvMediaType) {}

    async getStatsActivities(access: MediaListAccessScope, timeBucket: string) {
        return getDbClient()
            .select({
                mediaId,
                mediaType: libraryActivity.kind,
                specificGained: libraryActivity.unitsGained,
            })
            .from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(
                eq(libraryActivity.userId, access.ownerId),
                eq(libraryActivity.kind, this.kind),
                eq(libraryActivity.monthBucket, timeBucket),
                eq(libraryActivity.hidden, false),
                gt(libraryActivity.unitsGained, 0),
            ))
            .orderBy(asc(libraryActivity.lastUpdatedAt), asc(libraryActivity.id));
    }

    async getPaginatedActivities(access: MediaListAccessScope, filters: PaginatedActivityFilter) {
        const pagination = resolvePagination({
            page: filters.page,
            perPage: filters.perPage,
            defaultPerPage: 48,
            maxPerPage: 48,
        });
        const conditions: SQL[] = [
            eq(libraryActivity.userId, access.ownerId),
            eq(libraryActivity.kind, this.kind),
            eq(libraryActivity.monthBucket, filters.timeBucket),
            eq(libraryActivity.hidden, filters.hiddenOnly === true),
        ];

        if (filters.activityKind && filters.activityKind !== ActivityKind.ALL) {
            if (filters.activityKind === ActivityKind.REDO) {
                conditions.push(eq(libraryActivity.redo, true));
            }
            else if (filters.activityKind === ActivityKind.COMPLETED) {
                conditions.push(and(eq(libraryActivity.redo, false), eq(libraryActivity.completed, true))!);
            }
            else if (filters.activityKind === ActivityKind.PROGRESSED) {
                conditions.push(and(
                    eq(libraryActivity.redo, false),
                    gt(libraryActivity.unitsGained, 0),
                    eq(libraryActivity.completed, false),
                )!);
            }
        }

        if (filters.mediaIdsByType) {
            const matchingIds = filters.mediaIdsByType[this.kind] ?? [];
            if (matchingIds.length === 0) {
                return { items: [], total: 0, page: pagination.page, pages: 0, perPage: pagination.perPage };
            }
            conditions.push(inArray(libraryActivity.catalogItemId, matchingIds));
        }

        const baseQuery = () => getDbClient()
            .select({
                id: libraryActivity.id,
                userId: libraryActivity.userId,
                mediaId,
                mediaType: libraryActivity.kind,
                specificGained: libraryActivity.unitsGained,
                isCompleted: libraryActivity.completed,
                isRedo: libraryActivity.redo,
                hidden: libraryActivity.hidden,
                monthBucket: libraryActivity.monthBucket,
                lastUpdate: libraryActivity.lastUpdatedAt,
            })
            .from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ));

        const total = getDbClient()
            .select({ value: count() })
            .from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(...conditions))
            .get()?.value ?? 0;
        const rows = await baseQuery()
            .where(and(...conditions))
            .orderBy(desc(libraryActivity.lastUpdatedAt), asc(libraryActivity.id))
            .limit(pagination.limit)
            .offset(pagination.offset);

        return {
            items: rows,
            total,
            page: pagination.page,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
        };
    }

    async getActivityStatsByMonth(filters: {
        userId?: number;
        startMonth: string;
        excludeBulkImports?: boolean;
    }) {
        const conditions: SQL[] = [
            eq(libraryActivity.kind, this.kind),
            eq(libraryActivity.hidden, false),
            gt(libraryActivity.unitsGained, 0),
            gte(libraryActivity.monthBucket, filters.startMonth),
        ];
        if (filters.userId) conditions.push(eq(libraryActivity.userId, filters.userId));

        const query = getDbClient()
            .select({
                mediaId,
                mediaType: libraryActivity.kind,
                monthBucket: libraryActivity.monthBucket,
                specificGained: sum(libraryActivity.unitsGained).mapWith(Number),
            })
            .from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .$dynamic();

        if (filters.excludeBulkImports) {
            const bulkActivity = alias(libraryActivity, "bulk_activity");
            const likelyBulkMonths = getDbClient()
                .select({
                    userId: bulkActivity.userId,
                    monthBucket: bulkActivity.monthBucket,
                })
                .from(bulkActivity)
                .innerJoin(user, eq(user.id, bulkActivity.userId))
                .where(and(
                    eq(bulkActivity.hidden, false),
                    gt(bulkActivity.unitsGained, 0),
                    gte(bulkActivity.monthBucket, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                    sql`${bulkActivity.monthBucket} < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
                ))
                .groupBy(bulkActivity.userId, bulkActivity.monthBucket)
                .having(gt(count(), BULK_IMPORT_ACTIVITY_THRESHOLD))
                .as("likely_bulk_months");
            query.leftJoin(likelyBulkMonths, and(
                eq(libraryActivity.userId, likelyBulkMonths.userId),
                eq(libraryActivity.monthBucket, likelyBulkMonths.monthBucket),
            ));
            conditions.push(isNull(likelyBulkMonths.userId));
        }

        return query
            .where(and(...conditions))
            .groupBy(libraryActivity.monthBucket, libraryActivity.kind, libraryActivity.catalogItemId)
            .orderBy(asc(libraryActivity.monthBucket), asc(libraryActivity.kind));
    }
}
