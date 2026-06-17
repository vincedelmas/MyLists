import {SimpleSearch} from "@/lib/schemas";
import {alias} from "drizzle-orm/sqlite-core";
import {paginate} from "@/lib/server/database/pagination";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {LogUpdateParams} from "@/lib/types/user-updates.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {followers, user, userMediaUpdate} from "@/lib/server/database/schema";
import {MediaType, PrivacyType, SocialState, UpdateType} from "@/lib/utils/enums";
import {and, count, desc, eq, getTableColumns, gt, gte, inArray, isNull, like, or, SQL, sql} from "drizzle-orm";


const BULK_IMPORT_GRACE_MONTHS = 2;
const BULK_IMPORT_UPDATE_THRESHOLD = 200;


export class UserUpdatesRepository {
    static readonly updateThresholdSec = 300;

    static async getUserUpdates(userId: number, limit = 8) {
        return getDbClient().query.userMediaUpdate.findMany({
            where: eq(userMediaUpdate.userId, userId),
            orderBy: [desc(userMediaUpdate.timestamp)],
            limit: limit,
        });
    }

    static async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        const search = filters?.search ?? "";

        const baseConditions: SQL[] = [];
        if (userId !== undefined) baseConditions.push(eq(userMediaUpdate.userId, userId));
        if (search) baseConditions.push(like(userMediaUpdate.mediaName, `%${search}%`));

        const queryItems = getDbClient()
            .select({
                ...(userId === undefined ? { username: user.name } : {}),
                ...getTableColumns(userMediaUpdate),
            })
            .from(userMediaUpdate);

        if (userId === undefined) {
            queryItems.innerJoin(user, eq(userMediaUpdate.userId, user.id));
        }

        const { items, total } = await paginate({
            page: filters?.page,
            perPage: filters?.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: sql<number>`count()` })
                    .from(userMediaUpdate)
                    .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return queryItems
                    .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
                    .orderBy(desc(userMediaUpdate.timestamp))
                    .offset(offset)
                    .limit(limit);
            },
        });

        return { total, items };
    }

    static async getUserMediaHistory(userId: number, mediaType: MediaType, mediaId: number) {
        return getDbClient()
            .select()
            .from(userMediaUpdate)
            .where(and(
                eq(userMediaUpdate.userId, userId),
                eq(userMediaUpdate.mediaType, mediaType),
                eq(userMediaUpdate.mediaId, mediaId),
            ))
            .orderBy(desc(userMediaUpdate.timestamp));
    }

    static async getFollowsUpdates(profileOwnerId: number, visitorId?: number, limit = 10) {
        // Subquery: People that Profile Owner (User B) follows
        const followedByB = getDbClient()
            .select({ id: followers.followedId })
            .from(followers)
            .where(and(eq(followers.followerId, profileOwnerId), eq(followers.status, SocialState.ACCEPTED)));

        // Subquery: People that Visitor (User A) follows (Rule 3)
        const followedByA = visitorId
            ? getDbClient()
                .select({ id: followers.followedId })
                .from(followers)
                .where(and(eq(followers.followerId, visitorId), eq(followers.status, SocialState.ACCEPTED)))
            : null;

        // Define privacy filters based on rules
        const privacyConditions = [eq(user.privacy, PrivacyType.PUBLIC)] as any[];

        if (visitorId) {
            // Rule: Restricted updates visible only if logged in
            privacyConditions.push(eq(user.privacy, PrivacyType.RESTRICTED));

            // Rule: User A can always see their own updates
            privacyConditions.push(eq(user.id, visitorId));

            // Rule: Private updates visible only if User A follows that person
            if (followedByA) {
                privacyConditions.push(and(eq(user.privacy, PrivacyType.PRIVATE), inArray(user.id, followedByA)));
            }
        }

        return getDbClient()
            .select({
                username: user.name,
                ...getTableColumns(userMediaUpdate),
            })
            .from(userMediaUpdate)
            .innerJoin(user, eq(userMediaUpdate.userId, user.id))
            .where(and(
                // Limit updates to people User B follows
                inArray(userMediaUpdate.userId, followedByB),
                // Apply the combined privacy rules
                or(...privacyConditions)
            ))
            .orderBy(desc(userMediaUpdate.timestamp))
            .limit(limit);
    }

    static async mediaUpdatesStatsPerMonth({ mediaType, userId, excludeBulkImports }: { userId?: number, mediaType?: MediaType, excludeBulkImports?: boolean }) {
        const conditions: SQL[] = [];
        if (userId) conditions.push(eq(userMediaUpdate.userId, userId));
        if (mediaType) conditions.push(eq(userMediaUpdate.mediaType, mediaType));

        const query = getDbClient()
            .select({
                name: sql<string>`strftime('%m-%Y', ${userMediaUpdate.timestamp})`.as("name"),
                value: count(userMediaUpdate.mediaId).as("value"),
            })
            .from(userMediaUpdate)
            .$dynamic();

        if (excludeBulkImports) {
            const likelyBulkMonths = this._likelyBulkImportUserMonths();
            query.leftJoin(likelyBulkMonths, and(
                eq(userMediaUpdate.userId, likelyBulkMonths.userId),
                eq(sql<string>`strftime('%Y-%m', ${userMediaUpdate.timestamp})`, likelyBulkMonths.monthBucket),
            ));
            conditions.push(isNull(likelyBulkMonths.userId));
        }

        const monthlyCounts = await query
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .groupBy(sql`strftime('%m-%Y', ${userMediaUpdate.timestamp})`)
            .orderBy(sql`strftime('%Y-%m', ${userMediaUpdate.timestamp})`);

        const totalUpdates = monthlyCounts.reduce((a, c) => a + c.value, 0);

        return {
            totalUpdates: totalUpdates,
            updatesDistribution: monthlyCounts,
            avgUpdates: monthlyCounts.length ? (totalUpdates / monthlyCounts.length) : null,
        };
    }

    static async deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        await getDbClient()
            .delete(userMediaUpdate)
            .where(and(eq(userMediaUpdate.userId, userId), inArray(userMediaUpdate.id, updateIds)));

        if (returnData) {
            return getDbClient()
                .select()
                .from(userMediaUpdate)
                .where(eq(userMediaUpdate.userId, userId))
                .orderBy(desc(userMediaUpdate.timestamp))
                .limit(8).then((res) => res[res.length - 1] ?? null);
        }
    }

    static async deleteMediaUpdates(mediaType: MediaType, mediaIds: number[]) {
        await getDbClient()
            .delete(userMediaUpdate)
            .where(and(eq(userMediaUpdate.mediaType, mediaType), inArray(userMediaUpdate.mediaId, mediaIds)));
    }

    static async deleteRecentInitialAdd(userId: number, mediaType: MediaType, mediaId: number) {
        const previousUpdate = getDbClient()
            .select()
            .from(userMediaUpdate)
            .where(and(
                eq(userMediaUpdate.userId, userId),
                eq(userMediaUpdate.mediaId, mediaId),
                eq(userMediaUpdate.mediaType, mediaType),
                eq(userMediaUpdate.updateType, UpdateType.STATUS),
            ))
            .orderBy(desc(userMediaUpdate.timestamp))
            .get();

        if (!previousUpdate || previousUpdate.payload?.old_value !== null) return;

        const elapsedSec = (Date.now() - dateFromUTCInput(previousUpdate.timestamp).getTime()) / 1000;
        if (elapsedSec > this.updateThresholdSec) return;

        await getDbClient()
            .delete(userMediaUpdate)
            .where(eq(userMediaUpdate.id, previousUpdate.id));
    }

    static async logUpdate({ userId, mediaType, media, updateType, payload, timestamp }: LogUpdateParams) {
        const newUpdate = {
            userId,
            payload,
            mediaType,
            updateType,
            mediaId: media.id,
            mediaName: media.name,
            ...(timestamp ? { timestamp } : {}),
        };

        const previousUpdate = getDbClient()
            .select()
            .from(userMediaUpdate).where(and(
                eq(userMediaUpdate.userId, userId),
                eq(userMediaUpdate.mediaId, media.id),
                eq(userMediaUpdate.mediaType, mediaType),
                eq(userMediaUpdate.updateType, updateType),
            ))
            .orderBy(desc(userMediaUpdate.timestamp))
            .get();

        if (previousUpdate && !timestamp) {
            const elapsedSec = (Date.now() - dateFromUTCInput(previousUpdate.timestamp).getTime()) / 1000;
            if (elapsedSec >= 0 && elapsedSec <= this.updateThresholdSec) {
                await getDbClient()
                    .delete(userMediaUpdate)
                    .where(eq(userMediaUpdate.id, previousUpdate.id));
            }
        }

        await getDbClient()
            .insert(userMediaUpdate)
            .values(newUpdate);
    }

    private static _likelyBulkImportUserMonths() {
        const bulkUpdate = alias(userMediaUpdate, "bulk_update");

        return getDbClient()
            .select({
                userId: bulkUpdate.userId,
                monthBucket: sql<string>`strftime('%Y-%m', ${bulkUpdate.timestamp})`.as("month_bucket"),
            })
            .from(bulkUpdate)
            .innerJoin(user, eq(user.id, bulkUpdate.userId))
            .where(and(
                gte(sql<string>`strftime('%Y-%m', ${bulkUpdate.timestamp})`, sql<string>`strftime('%Y-%m', ${user.createdAt})`),
                sql`strftime('%Y-%m', ${bulkUpdate.timestamp}) < strftime('%Y-%m', date(${user.createdAt}, 'start of month', '+' || ${BULK_IMPORT_GRACE_MONTHS} || ' months'))`,
            ))
            .groupBy(bulkUpdate.userId, sql`strftime('%Y-%m', ${bulkUpdate.timestamp})`)
            .having(gt(count(), BULK_IMPORT_UPDATE_THRESHOLD))
            .as("likely_bulk_update_months");
    }
}
