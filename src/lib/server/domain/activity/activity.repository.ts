import {UpdateActivity} from "@/lib/schemas";
import {alias} from "drizzle-orm/sqlite-core";
import {getImageUrl} from "@/lib/utils/image-url";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {PaginatedActivityFilter} from "@/lib/types/activity.types";
import {resolvePagination} from "@/lib/server/database/pagination";
import {LibraryAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {dateFromUTCInput, monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {and, asc, count, desc, eq, gt, gte, inArray, isNull, like, lte, ne, or, SQL, sql, sum} from "drizzle-orm";
import {catalogItem, libraryActivity, libraryEntry, movieDetails, profileMediaChannel, tvDetails, user} from "@/lib/server/database/schema";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_ACTIVITY_THRESHOLD = 200;
const mediaId = sql<number>`${libraryActivity.catalogItemId}`;


export class ActivityRepository {
    static async addActivity(userId: number, payload: {
        mediaType: MediaType;
        mediaId: number;
        specificGained: number;
        isCompleted?: boolean;
        isRedo?: boolean;
        hidden?: boolean;
        lastUpdate: string;
    }) {
        const subject = getDbClient().select({
            catalogItemId: catalogItem.id,
            libraryEntryId: libraryEntry.id,
        }).from(catalogItem).innerJoin(libraryEntry, and(
            eq(libraryEntry.catalogItemId, catalogItem.id),
            eq(libraryEntry.userId, userId),
        )).where(and(
            eq(catalogItem.kind, payload.mediaType),
            eq(catalogItem.id, payload.mediaId),
        )).get();
        if (!subject) throw new Error("Media not in your list");

        const occurredAt = dateFromUTCInput(payload.lastUpdate).toISOString();
        return getDbClient().insert(libraryActivity).values({
            userId,
            kind: payload.mediaType,
            catalogItemId: subject.catalogItemId,
            libraryEntryId: subject.libraryEntryId,
            unitsGained: payload.specificGained,
            completed: payload.isCompleted ?? false,
            redo: payload.isRedo ?? false,
            hidden: payload.hidden ?? false,
            monthBucket: monthBucketFromDateInput(occurredAt),
            lastUpdatedAt: occurredAt,
        }).onConflictDoUpdate({
            target: [libraryActivity.userId, libraryActivity.catalogItemId, libraryActivity.monthBucket],
            set: {
                unitsGained: sql`${libraryActivity.unitsGained} + excluded.units_gained`,
                completed: sql`${libraryActivity.completed} OR excluded.completed`,
                redo: sql`${libraryActivity.redo} OR excluded.redo`,
                hidden: sql`${libraryActivity.hidden} AND excluded.hidden`,
                lastUpdatedAt: sql`excluded.last_updated_at`,
                libraryEntryId: subject.libraryEntryId,
            },
        }).returning().get();
    }

    static async updateActivity(userId: number, activityId: number, payload: UpdateActivity) {
        const existing = getDbClient().select().from(libraryActivity).where(and(
            eq(libraryActivity.id, activityId),
            eq(libraryActivity.userId, userId),
        )).get();
        if (!existing) return null;

        const monthBucket = payload.lastUpdate
            ? monthBucketFromDateInput(payload.lastUpdate)
            : existing.monthBucket;
        const values = {
            unitsGained: payload.specificGained ?? existing.unitsGained,
            completed: payload.isCompleted ?? existing.completed,
            redo: payload.isRedo ?? existing.redo,
            hidden: payload.hidden ?? existing.hidden,
            lastUpdatedAt: payload.lastUpdate ?? existing.lastUpdatedAt,
            monthBucket,
        };
        if (monthBucket === existing.monthBucket) {
            return getDbClient().update(libraryActivity).set(values).where(and(
                eq(libraryActivity.id, activityId),
                eq(libraryActivity.userId, userId),
            )).returning().get();
        }

        const moved = getDbClient().insert(libraryActivity).values({
            userId: existing.userId,
            kind: existing.kind,
            catalogItemId: existing.catalogItemId,
            libraryEntryId: existing.libraryEntryId,
            ...values,
        }).onConflictDoUpdate({
            target: [libraryActivity.userId, libraryActivity.catalogItemId, libraryActivity.monthBucket],
            set: {
                unitsGained: sql`${libraryActivity.unitsGained} + ${values.unitsGained}`,
                completed: values.completed,
                redo: values.redo,
                hidden: values.hidden,
                lastUpdatedAt: values.lastUpdatedAt,
                libraryEntryId: existing.libraryEntryId,
            },
        }).returning().get();
        await getDbClient().delete(libraryActivity).where(eq(libraryActivity.id, activityId));
        return moved;
    }

    static deleteActivity(userId: number, activityId: number) {
        return getDbClient().delete(libraryActivity).where(and(
            eq(libraryActivity.id, activityId),
            eq(libraryActivity.userId, userId),
        ));
    }

    static async getMediaDetailsByIds(mediaType: MediaType, mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];

        const rows = await getDbClient().select({
            id: catalogItem.id,
            name: catalogItem.name,
            imageCover: catalogItem.imageCover,
            releaseDate: catalogItem.releaseDate,
            duration: sql<number | null>`CASE
                WHEN ${catalogItem.kind} IN ('series', 'anime') THEN ${tvDetails.episodeDurationMinutes}
                WHEN ${catalogItem.kind} = 'movies' THEN ${movieDetails.durationMinutes}
                ELSE NULL
            END`,
        }).from(catalogItem)
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, mediaType),
                inArray(catalogItem.id, uniqueIds),
            ));

        return rows.map((row) => ({
            ...row,
            duration: row.duration ?? undefined,
            releaseDate: row.releaseDate ?? "",
            imageCover: getImageUrl(`${mediaType}-covers`, row.imageCover),
            customCover: null,
        }));
    }

    static async getMediaDurationsByIds(mediaType: MediaType, mediaIds: number[]) {
        const uniqueIds = [...new Set(mediaIds)];
        if (uniqueIds.length === 0) return [];

        return getDbClient().select({
            id: catalogItem.id,
            duration: sql<number | null>`CASE
                WHEN ${catalogItem.kind} IN ('series', 'anime') THEN ${tvDetails.episodeDurationMinutes}
                WHEN ${catalogItem.kind} = 'movies' THEN ${movieDetails.durationMinutes}
                ELSE NULL
            END`,
        }).from(catalogItem)
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, mediaType),
                inArray(catalogItem.id, uniqueIds),
            ));
    }

    static async searchUserListByName(userId: number, mediaType: MediaType, query: string, limit: number) {
        return getDbClient().select({ mediaId: catalogItem.id })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, mediaType),
                like(catalogItem.name, `%${query}%`),
            ))
            .orderBy(catalogItem.name)
            .limit(limit);
    }

    static async bulkHideActivity(userId: number, filters: { startDate: string; endDate: string; mediaType?: MediaType }) {
        const conditions: SQL[] = [
            eq(libraryActivity.userId, userId),
            ne(libraryActivity.hidden, true),
            gte(libraryActivity.lastUpdatedAt, filters.startDate),
            lte(libraryActivity.lastUpdatedAt, filters.endDate),
        ];
        if (filters.mediaType) conditions.push(eq(libraryActivity.kind, filters.mediaType));
        const rows = await getDbClient().update(libraryActivity).set({ hidden: true })
            .where(and(...conditions)).returning({ id: libraryActivity.id });
        return { count: rows.length };
    }

    static getStatsActivities(access: LibraryAccessScope, mediaTypes: MediaType[], timeBucket: string) {
        return getDbClient().select({
            mediaId,
            mediaType: libraryActivity.kind,
            specificGained: libraryActivity.unitsGained,
        }).from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, libraryActivity.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(
                eq(libraryActivity.userId, access.ownerId),
                gt(libraryActivity.unitsGained, 0),
                eq(libraryActivity.monthBucket, timeBucket),
                inArray(libraryActivity.kind, mediaTypes),
                eq(libraryActivity.hidden, false),
            ))
            .orderBy(asc(libraryActivity.lastUpdatedAt), asc(libraryActivity.id));
    }

    static async getActivityMediaTypes(access: LibraryAccessScope, timeBucket: string, hiddenOnly = false) {
        const rows = await getDbClient().selectDistinct({ mediaType: libraryActivity.kind })
            .from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, libraryActivity.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(
                eq(libraryActivity.userId, access.ownerId),
                eq(libraryActivity.monthBucket, timeBucket),
                eq(libraryActivity.hidden, hiddenOnly),
            ))
            .orderBy(asc(libraryActivity.kind));
        return rows.map(({ mediaType }) => mediaType);
    }

    static async getPaginatedActivities(access: LibraryAccessScope, filters: PaginatedActivityFilter) {
        const pagination = resolvePagination({
            page: filters.page,
            perPage: filters.perPage,
            defaultPerPage: 48,
            maxPerPage: 48,
        });
        const conditions: SQL[] = [
            eq(libraryActivity.userId, access.ownerId),
            eq(libraryActivity.monthBucket, filters.timeBucket),
            eq(libraryActivity.hidden, filters.hiddenOnly === true),
        ];
        if (filters.mediaType) conditions.push(eq(libraryActivity.kind, filters.mediaType));
        if (filters.activityKind && filters.activityKind !== ActivityKind.ALL) {
            if (filters.activityKind === ActivityKind.REDO) conditions.push(eq(libraryActivity.redo, true));
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
            const searchConditions = Object.entries(filters.mediaIdsByType)
                .filter((entry): entry is [MediaType, number[]] => entry[1].length > 0)
                .map(([mediaType, ids]) => and(eq(libraryActivity.kind, mediaType), inArray(libraryActivity.catalogItemId, ids))!)
                .filter(Boolean);
            if (searchConditions.length === 0) {
                return { items: [], total: 0, page: pagination.page, pages: 0, perPage: pagination.perPage };
            }
            conditions.push(or(...searchConditions)!);
        }

        const joins = () => getDbClient().select({
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
        }).from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, libraryActivity.kind),
                eq(profileMediaChannel.enabled, true),
            ));
        const total = getDbClient().select({ value: count() }).from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, libraryActivity.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(...conditions)).get()?.value ?? 0;
        const rows = await joins().where(and(...conditions))
            .orderBy(desc(libraryActivity.lastUpdatedAt), asc(libraryActivity.id))
            .limit(pagination.limit).offset(pagination.offset);
        return {
            items: rows,
            total,
            page: pagination.page,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
        };
    }

    static async getActivityStatsByMonth(filters: {
        userId?: number;
        mediaType?: MediaType;
        startMonth: string;
        excludeBulkImports?: boolean;
    }) {
        const conditions: SQL[] = [
            eq(libraryActivity.hidden, false),
            gt(libraryActivity.unitsGained, 0),
            gte(libraryActivity.monthBucket, filters.startMonth),
            eq(profileMediaChannel.enabled, true),
        ];
        if (filters.userId !== undefined) conditions.push(eq(libraryActivity.userId, filters.userId));
        if (filters.mediaType !== undefined) conditions.push(eq(libraryActivity.kind, filters.mediaType));
        const query = getDbClient().select({
            mediaId,
            mediaType: libraryActivity.kind,
            monthBucket: libraryActivity.monthBucket,
            specificGained: sum(libraryActivity.unitsGained).mapWith(Number),
        }).from(libraryActivity)
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryActivity.userId),
                eq(profileMediaChannel.kind, libraryActivity.kind),
            ))
            .$dynamic();
        if (filters.excludeBulkImports) {
            const likelyBulkMonths = this.likelyBulkImportUserMonths();
            query.leftJoin(likelyBulkMonths, and(
                eq(libraryActivity.userId, likelyBulkMonths.userId),
                eq(libraryActivity.monthBucket, likelyBulkMonths.monthBucket),
            ));
            conditions.push(isNull(likelyBulkMonths.userId));
        }
        return query.where(and(...conditions))
            .groupBy(libraryActivity.monthBucket, libraryActivity.kind, libraryActivity.catalogItemId)
            .orderBy(asc(libraryActivity.monthBucket), asc(libraryActivity.kind));
    }

    private static likelyBulkImportUserMonths() {
        const bulkActivity = alias(libraryActivity, "bulk_activity");
        return getDbClient().select({
            userId: bulkActivity.userId,
            monthBucket: bulkActivity.monthBucket,
        }).from(bulkActivity)
            .innerJoin(user, eq(user.id, bulkActivity.userId))
            .where(and(
                eq(bulkActivity.hidden, false),
                gt(bulkActivity.unitsGained, 0),
                gte(bulkActivity.monthBucket, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                sql`${bulkActivity.monthBucket} < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
            ))
            .groupBy(bulkActivity.userId, bulkActivity.monthBucket)
            .having(gt(count(), BULK_IMPORT_ACTIVITY_THRESHOLD))
            .as("likely_bulk_activity_months");
    }
}
