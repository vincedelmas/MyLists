import {alias} from "drizzle-orm/sqlite-core";
import {SimpleSearch} from "@/lib/schemas";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {paginate} from "@/lib/server/database/pagination";
import {
    catalogItem,
    followers,
    libraryChange,
    libraryEntry,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";
import {and, count, desc, eq, gt, gte, inArray, like, or, SQL, sql} from "drizzle-orm";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_UPDATE_THRESHOLD = 200;
const mediaName = sql<string>`coalesce(${libraryChange.mediaNameSnapshot}, ${catalogItem.name})`;


export class ProfileUpdatesRepository {
    static async getUserUpdates(userId: number, limit = 8) {
        const rows = await baseUpdateQuery()
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(profileMediaChannel.enabled, true),
            ))
            .orderBy(desc(libraryChange.occurredAt))
            .limit(limit);
        return rows.map(toLegacyUpdate);
    }

    static async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        const conditions: SQL[] = [];
        if (userId !== undefined) {
            conditions.push(eq(libraryEntry.userId, userId), eq(profileMediaChannel.enabled, true));
        }
        if (filters.search) conditions.push(like(mediaName, `%${filters.search}%`));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const { items, total } = await paginate({
            page: filters.page,
            perPage: filters.perPage,
            getTotal: () => getDbClient().select({ value: count() })
                .from(libraryChange)
                .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(profileMediaChannel, and(
                    eq(profileMediaChannel.userId, libraryEntry.userId),
                    eq(profileMediaChannel.kind, catalogItem.kind),
                ))
                .where(where).get()?.value ?? 0,
            getItems: async ({ limit, offset }) => {
                const rows = await baseUpdateQuery(userId === undefined)
                    .where(where)
                    .orderBy(desc(libraryChange.occurredAt))
                    .offset(offset)
                    .limit(limit);
                return rows.map(toLegacyUpdate);
            },
        });
        return { total, items };
    }

    static async getFollowsUpdates(profileOwnerId: number, visitorId?: number, limit = 10) {
        const followedByOwner = getDbClient().select({ id: followers.followedId })
            .from(followers)
            .where(and(eq(followers.followerId, profileOwnerId), eq(followers.status, SocialState.ACCEPTED)));
        const privacyConditions: SQL[] = [eq(user.privacy, PrivacyType.PUBLIC)];
        if (visitorId !== undefined) {
            const followedByVisitor = getDbClient().select({ id: followers.followedId })
                .from(followers)
                .where(and(eq(followers.followerId, visitorId), eq(followers.status, SocialState.ACCEPTED)));
            privacyConditions.push(
                eq(user.privacy, PrivacyType.RESTRICTED),
                eq(user.id, visitorId),
                and(eq(user.privacy, PrivacyType.PRIVATE), inArray(user.id, followedByVisitor))!,
            );
        }

        const rows = await baseUpdateQuery(true)
            .where(and(
                inArray(libraryEntry.userId, followedByOwner),
                or(...privacyConditions),
                eq(profileMediaChannel.enabled, true),
            ))
            .orderBy(desc(libraryChange.occurredAt))
            .limit(limit);
        return rows.map(toLegacyUpdate);
    }

    static async deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        if (updateIds.length > 0) {
            const ownedEntries = getDbClient().select({ id: libraryEntry.id })
                .from(libraryEntry)
                .where(eq(libraryEntry.userId, userId));
            await getDbClient().delete(libraryChange).where(and(
                inArray(libraryChange.id, updateIds),
                inArray(libraryChange.libraryEntryId, ownedEntries),
            ));
        }
        if (!returnData) return;
        const remaining = await this.getUserUpdates(userId, 8);
        return remaining.at(-1) ?? null;
    }

    static async mediaUpdatesStatsPerMonth(filters: {
        userId?: number;
        mediaType?: MediaType;
        excludeBulkImports?: boolean;
    }) {
        const conditions: SQL[] = [eq(profileMediaChannel.enabled, true)];
        if (filters.userId !== undefined) conditions.push(eq(libraryEntry.userId, filters.userId));
        if (filters.mediaType !== undefined) conditions.push(eq(catalogItem.kind, filters.mediaType));

        const query = getDbClient().select({
            name: sql<string>`strftime('%m-%Y', ${libraryChange.occurredAt})`.as("name"),
            value: count(libraryChange.id).as("value"),
        }).from(libraryChange)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryEntry.userId),
                eq(profileMediaChannel.kind, catalogItem.kind),
            ))
            .$dynamic();

        if (filters.excludeBulkImports) {
            const likelyBulkMonths = this.likelyBulkImportUserMonths();
            query.leftJoin(likelyBulkMonths, and(
                eq(libraryEntry.userId, likelyBulkMonths.userId),
                eq(sql<string>`strftime('%Y-%m', ${libraryChange.occurredAt})`, likelyBulkMonths.monthBucket),
            ));
            conditions.push(sql`${likelyBulkMonths.userId} IS NULL`);
        }
        const monthlyCounts = await query.where(and(...conditions))
            .groupBy(sql`strftime('%m-%Y', ${libraryChange.occurredAt})`)
            .orderBy(sql`strftime('%Y-%m', ${libraryChange.occurredAt})`);
        const totalUpdates = monthlyCounts.reduce((sum, month) => sum + month.value, 0);
        return {
            totalUpdates,
            updatesDistribution: monthlyCounts,
            avgUpdates: monthlyCounts.length > 0 ? totalUpdates / monthlyCounts.length : null,
        };
    }

    private static likelyBulkImportUserMonths() {
        const bulkChange = alias(libraryChange, "bulk_change");
        const bulkEntry = alias(libraryEntry, "bulk_entry");
        return getDbClient().select({
            userId: bulkEntry.userId,
            monthBucket: sql<string>`strftime('%Y-%m', ${bulkChange.occurredAt})`.as("month_bucket"),
        }).from(bulkChange)
            .innerJoin(bulkEntry, eq(bulkEntry.id, bulkChange.libraryEntryId))
            .innerJoin(user, eq(user.id, bulkEntry.userId))
            .where(and(
                gte(sql<string>`strftime('%Y-%m', ${bulkChange.occurredAt})`, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                sql`strftime('%Y-%m', ${bulkChange.occurredAt}) < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
            ))
            .groupBy(bulkEntry.userId, sql`strftime('%Y-%m', ${bulkChange.occurredAt})`)
            .having(gt(count(), BULK_IMPORT_UPDATE_THRESHOLD))
            .as("likely_bulk_update_months");
    }
}


const updateSelection = (includeUsername: boolean) => ({
    ...(includeUsername ? { username: user.name } : {}),
    id: libraryChange.id,
    userId: libraryEntry.userId,
    mediaId: catalogItem.id,
    mediaName,
    mediaType: catalogItem.kind,
    updateType: libraryChange.updateType,
    payload: libraryChange.payload,
    timestamp: libraryChange.occurredAt,
});


const baseUpdateQuery = (includeUsername = false) => getDbClient()
    .select(updateSelection(includeUsername))
    .from(libraryChange)
    .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
    .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
    .innerJoin(profileMediaChannel, and(
        eq(profileMediaChannel.userId, libraryEntry.userId),
        eq(profileMediaChannel.kind, catalogItem.kind),
    ))
    .leftJoin(user, eq(user.id, libraryEntry.userId))
    .$dynamic();


const toLegacyUpdate = <T extends {
    id: number;
    payload: { oldValue?: unknown; newValue?: unknown; old_value?: unknown; new_value?: unknown } | null;
}>(row: T) => {
    const { payload, ...rest } = row;
    return {
        ...rest,
        payload: payload ? {
            old_value: (Object.hasOwn(payload, "oldValue") ? payload.oldValue : payload.old_value) as any,
            new_value: (Object.hasOwn(payload, "newValue") ? payload.newValue : payload.new_value) as any,
        } : null,
    };
};
