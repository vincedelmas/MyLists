import {formatMonthYear} from "@/lib/utils/date-formatting";
import {AdminUpdatePayload, SearchType} from "@/lib/schemas";
import {getDbClient} from "@/lib/server/database/async-storage";
import {PrivacyType, RatingSystemType} from "@/lib/utils/enums";
import {and, asc, count, desc, eq, like, sql} from "drizzle-orm";
import {user, userMediaSettings} from "@/lib/server/database/schema";
import {paginate, resolveSorting} from "@/lib/server/database/pagination";


const orderByMediaType = sql`
    CASE ${userMediaSettings.mediaType}
        WHEN 'series' THEN 1
        WHEN 'anime' THEN 2
        WHEN 'movies' THEN 3
        WHEN 'books' THEN 4
        WHEN 'games' THEN 5
        WHEN 'manga' THEN 6
        ELSE 7
    END
`;


export class AccountRepository {
    // --- Tasks & Admin ----------------------------------------------------

    static async deleteNonActivatedOldUsers() {
        const result = await getDbClient()
            .delete(user)
            .where(and(eq(user.emailVerified, false), sql`${user.createdAt} < datetime('now', '-7 days')`))
            .returning({ id: user.id });

        return result.length;
    }

    static async getUserStatsForAdmin() {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

        const res = getDbClient()
            .select({
                totalUsers: count(),
                usersSeenThisMonth: sql<number>`SUM(CASE WHEN ${user.updatedAt} > ${currentMonthStart} THEN 1 ELSE 0 END)`,
                newUsersThisMonth: sql<number>`SUM(CASE WHEN ${user.createdAt} >= ${currentMonthStart} THEN 1 ELSE 0 END)`,
                scoreRatingUsers: sql<number>`SUM(CASE WHEN ${user.ratingSystem} = ${RatingSystemType.SCORE} THEN 1 ELSE 0 END)`,
                feelingRatingUsers: sql<number>`SUM(CASE WHEN ${user.ratingSystem} = ${RatingSystemType.FEELING} THEN 1 ELSE 0 END)`,
                newUsersPreviousMonth: sql<number>`SUM(CASE WHEN ${user.createdAt} >= ${previousMonthStart} AND ${user.createdAt} < ${currentMonthStart} THEN 1 ELSE 0 END)`,
            })
            .from(user)
            .get();

        return {
            totalUsers: { count: res?.totalUsers || 0 },
            scoreRatingUsers: { count: res?.scoreRatingUsers || 0 },
            feelingRatingUsers: { count: res?.feelingRatingUsers || 0 },
            usersSeenThisMonth: { count: res?.usersSeenThisMonth || 0 },
            newUsers: {
                count: res?.newUsersThisMonth || 0,
                comparedToLastMonth: (res?.newUsersThisMonth || 0) - (res?.newUsersPreviousMonth || 0),
            },
        };
    }

    static async getUsersPerPrivacyValueForAdmin() {
        const privacyValues = Object.values(PrivacyType);

        const result = await getDbClient()
            .select({
                count: count(),
                privacy: user.privacy,
            })
            .from(user)
            .groupBy(user.privacy);

        return privacyValues.map((privacy) => ({
            privacy,
            count: result.find((r) => r.privacy === privacy)?.count ?? 0,
        }));
    }

    static async getActiveUsersForAdmin(limit: number) {
        return getDbClient()
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                privacy: user.privacy,
                updatedAt: user.updatedAt,
                createdAt: user.createdAt,
            })
            .from(user)
            .orderBy(desc(user.updatedAt))
            .limit(limit);
    }

    static async getCumUsersPerMonthForAdmin() {
        const results = getDbClient()
            .all<{ month: string, count: number }>(sql`
                WITH monthly_buckets AS (
                    SELECT
                        strftime('%Y-%m', ${user.createdAt}) as month,
                        strftime('%Y-%m-01', ${user.createdAt}) as month_start
                    FROM ${user}
                    WHERE ${user.createdAt} <= date('now')
                ), 
                monthly_agg AS (
                    SELECT 
                        month,
                        month_start,
                        COUNT(*) as monthly_count,
                        SUM(COUNT(*)) OVER (ORDER BY month_start ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cum_count
                    FROM monthly_buckets
                    GROUP BY month, month_start
                )
                SELECT
                    month,
                    cum_count as count
                FROM (
                    SELECT *
                    FROM monthly_agg
                    ORDER BY month_start DESC
                ) AS recent_months
                ORDER BY month_start ASC
            `);

        return results.map((row) => ({
            count: Number(row.count),
            month: formatMonthYear(row.month),
        }));
    }

    static async updateUserLastSeen(userId: number) {
        await getDbClient()
            .update(user)
            .set({ updatedAt: sql`datetime('now')` })
            .where(eq(user.id, userId));
    }

    static async findUserByName(name: string) {
        return getDbClient()
            .select()
            .from(user)
            .where(eq(user.name, name))
            .get();
    }

    static async getMinimalUserSettings(userId: number) {
        return getDbClient()
            .select({
                active: userMediaSettings.active,
                mediaType: userMediaSettings.mediaType,
            })
            .from(userMediaSettings)
            .where(eq(userMediaSettings.userId, userId))
            .orderBy(orderByMediaType);
    }

    static async updateUserSettings(userId: number, payload: Partial<typeof user.$inferInsert>) {
        await getDbClient()
            .update(user)
            .set(payload)
            .where(eq(user.id, userId));
    }

    static async getAdminPaginatedUsers(data: SearchType) {
        const search = data.search ?? "";
        const sortDesc = data.sortDesc ?? true;

        const allowedSorts = ["id", "name", "createdAt", "updatedAt", "privacy", "showUpdateModal", "role", "emailVerified"] as const;
        const sorting = resolveSorting(data.sorting, allowedSorts, "updatedAt");

        const { items, total, pages } = await paginate({
            page: data.page,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(user)
                    .where(like(user.name, `%${search}%`))
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select()
                    .from(user)
                    .offset(offset)
                    .limit(limit)
                    .orderBy(sortDesc ? desc(user[sorting]) : asc(user[sorting]))
                    .where(like(user.name, `%${search}%`));
            },
        });

        return { items, total, pages };
    }

    static async adminUpdateUser(userId: number, payload: Omit<AdminUpdatePayload, "deleteUser">) {
        await getDbClient()
            .update(user)
            .set(payload)
            .where(eq(user.id, userId));
    }

    static async updateFeatureFlag(userId: number) {
        await getDbClient()
            .update(user)
            .set({ showUpdateModal: false })
            .where(eq(user.id, userId));
    }

    static async deleteUserAccount(userId: number) {
        await getDbClient()
            .delete(user)
            .where(eq(user.id, userId));
    }

    static async adminUpdateGlobalFlag(payload: AdminUpdatePayload) {
        const updateData: Partial<typeof user.$inferInsert> = {};

        if (payload.showUpdateModal !== undefined) {
            updateData.showUpdateModal = payload.showUpdateModal;
        }

        if (payload.showOnboarding !== undefined) {
            updateData.showOnboarding = payload.showOnboarding;
        }

        if (Object.keys(updateData).length === 0) return;

        await getDbClient()
            .update(user)
            .set(updateData);
    }

    static async findByUsername(username: string) {
        const userResult = await getDbClient().query.user.findFirst({
            where: eq(user.name, username),
            with: {
                userMediaSettings: {
                    orderBy: () => [asc(orderByMediaType)],
                },
            },
        });

        if (!userResult) return null;
        return userResult;
    }

    static async updateShowOnboarding(userId: number) {
        await getDbClient()
            .update(user)
            .set({ showOnboarding: false })
            .where(eq(user.id, userId));
    }

    static async findById(userId: number) {
        return getDbClient().query.user.findFirst({
            where: eq(user.id, userId),
            with: { userMediaSettings: true },
        });
    }
}
