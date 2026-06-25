import {SearchType} from "@/lib/schemas";
import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {inactiveAccountDeletion, user} from "@/lib/server/database/schema";
import {InactiveAccountWarningFailedPayload, InactiveAccountWarningSentPayload} from "@/lib/types/inactive.types";
import {and, asc, count, eq, exists, gt, gte, inArray, isNull, like, lt, lte, notExists, or, sql} from "drizzle-orm";


export class InactiveAccountRepository {
    static async getWarningTargets(limit: number, maxRetries: number) {
        const db = getDbClient();
        const warningDueAt = sql<string>`datetime('now', '-2 years', '+30 days')`;

        const retryTargets = await db
            .select({
                userId: user.id,
                email: user.email,
                username: user.name,
                lastSeenAt: user.updatedAt,
                lifecycleId: inactiveAccountDeletion.id,
                emailRetryCount: inactiveAccountDeletion.emailRetryCount,
                deletionScheduledAt: inactiveAccountDeletion.deletionScheduledAt,
            })
            .from(inactiveAccountDeletion)
            .innerJoin(user, eq(user.id, inactiveAccountDeletion.userId))
            .where(and(
                eq(user.emailVerified, true),
                lte(user.updatedAt, warningDueAt),
                isNull(inactiveAccountDeletion.warningSentAt),
                eq(inactiveAccountDeletion.status, "mail_failed"),
                lt(inactiveAccountDeletion.emailRetryCount, maxRetries),
            ))
            .orderBy(asc(user.updatedAt))
            .limit(limit);

        const newTargets = await db
            .select({
                userId: user.id,
                email: user.email,
                username: user.name,
                lastSeenAt: user.updatedAt,
                emailRetryCount: sql<number>`0`,
                lifecycleId: sql<number | null>`NULL`,
                deletionScheduledAt: sql<string>`
                    CASE
                        WHEN datetime(${user.updatedAt}, '+2 years') < datetime('now', '+30 days')
                        THEN datetime('now', '+30 days')
                        ELSE datetime(${user.updatedAt}, '+2 years')
                    END
                `,
            })
            .from(user)
            .where(and(
                lte(user.updatedAt, warningDueAt),
                eq(user.emailVerified, true),
                notExists(db
                    .select({ one: sql`1` })
                    .from(inactiveAccountDeletion)
                    .where(and(
                        isNull(inactiveAccountDeletion.deletedAt),
                        eq(inactiveAccountDeletion.userId, user.id),
                        isNull(inactiveAccountDeletion.resurrectedAt),
                        inArray(inactiveAccountDeletion.status, ["warned", "mail_failed"]),
                    ))),
            ))
            .orderBy(asc(user.updatedAt))
            .limit(limit);

        return [...retryTargets, ...newTargets]
            .sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt))
            .slice(0, limit);
    }

    static async inactiveAccountWarningSent(payload: InactiveAccountWarningSentPayload) {
        const values = {
            lastEmailError: null,
            status: "warned" as const,
            updatedAt: sql`datetime('now')`,
            warningSentAt: sql`datetime('now')`,
            lastEmailAttemptAt: sql`datetime('now')`,
            warningTokenHash: payload.warningTokenHash,
        };

        if (payload.lifecycleId) {
            await getDbClient()
                .update(inactiveAccountDeletion)
                .set(values)
                .where(eq(inactiveAccountDeletion.id, payload.lifecycleId));
            return;
        }

        await getDbClient()
            .insert(inactiveAccountDeletion)
            .values({
                ...values,
                emailRetryCount: 0,
                userId: payload.userId,
                username: payload.username,
                lastSeenAt: payload.lastSeenAt,
                deletionScheduledAt: payload.deletionScheduledAt,
            });
    }

    static async recordInactiveAccountWarningFailed(payload: InactiveAccountWarningFailedPayload) {
        const safeMessage = payload.errorMessage.slice(0, 500);

        if (payload.lifecycleId) {
            await getDbClient()
                .update(inactiveAccountDeletion)
                .set({
                    status: "mail_failed",
                    lastEmailError: safeMessage,
                    updatedAt: sql`datetime('now')`,
                    lastEmailAttemptAt: sql`datetime('now')`,
                    emailRetryCount: sql`${inactiveAccountDeletion.emailRetryCount} + 1`,
                })
                .where(eq(inactiveAccountDeletion.id, payload.lifecycleId));
            return;
        }

        await getDbClient()
            .insert(inactiveAccountDeletion)
            .values({
                emailRetryCount: 1,
                status: "mail_failed",
                userId: payload.userId,
                username: payload.username,
                lastEmailError: safeMessage,
                lastSeenAt: payload.lastSeenAt,
                lastEmailAttemptAt: sql`datetime('now')`,
                deletionScheduledAt: payload.deletionScheduledAt,
            });
    }

    static async markResurrectedForSeenUsers() {
        const db = getDbClient();

        const rows = await db
            .update(inactiveAccountDeletion)
            .set({
                status: "resurrected",
                warningTokenHash: null,
                updatedAt: sql`datetime('now')`,
                resurrectedAt: sql`datetime('now')`,
            })
            .where(and(
                isNull(inactiveAccountDeletion.deletedAt),
                isNull(inactiveAccountDeletion.resurrectedAt),
                inArray(inactiveAccountDeletion.status, ["warned", "mail_failed"]),
                exists(db
                    .select({ one: sql`1` })
                    .from(user)
                    .where(and(
                        eq(user.id, inactiveAccountDeletion.userId),
                        gt(user.updatedAt, inactiveAccountDeletion.lastSeenAt),
                    ))),
            )).returning({ id: inactiveAccountDeletion.id });

        return rows.length;
    }

    static async markResurrectedForUser(userId: number) {
        const rows = await getDbClient()
            .update(inactiveAccountDeletion)
            .set({
                status: "resurrected",
                warningTokenHash: null,
                updatedAt: sql`datetime('now')`,
                resurrectedAt: sql`datetime('now')`,
            })
            .where(and(
                isNull(inactiveAccountDeletion.deletedAt),
                eq(inactiveAccountDeletion.userId, userId),
                isNull(inactiveAccountDeletion.resurrectedAt),
                inArray(inactiveAccountDeletion.status, ["warned", "mail_failed"]),
            )).returning({ id: inactiveAccountDeletion.id });

        return rows.length;
    }

    static async findUserIdByWarningTokenHash(warningTokenHash: string) {
        return getDbClient()
            .select({ userId: inactiveAccountDeletion.userId })
            .from(inactiveAccountDeletion)
            .where(and(
                eq(inactiveAccountDeletion.status, "warned"),
                eq(inactiveAccountDeletion.warningTokenHash, warningTokenHash),
            )).get();
    }

    static async getInactiveAccountDeletionTargets(maxRetries: number) {
        return getDbClient()
            .select({
                userId: user.id,
                username: user.name,
                lifecycleId: inactiveAccountDeletion.id,
            })
            .from(inactiveAccountDeletion)
            .innerJoin(user, eq(user.id, inactiveAccountDeletion.userId))
            .where(and(
                or(
                    eq(inactiveAccountDeletion.status, "warned"),
                    and(eq(inactiveAccountDeletion.status, "mail_failed"), gte(inactiveAccountDeletion.emailRetryCount, maxRetries)),
                ),
                isNull(inactiveAccountDeletion.deletedAt),
                isNull(inactiveAccountDeletion.resurrectedAt),
                lte(user.updatedAt, inactiveAccountDeletion.lastSeenAt),
                lte(inactiveAccountDeletion.deletionScheduledAt, sql<string>`datetime('now')`),
            ))
            .orderBy(asc(inactiveAccountDeletion.deletionScheduledAt));
    }

    static async markDeleted(lifecycleId: number, username: string) {
        await getDbClient()
            .update(inactiveAccountDeletion)
            .set({
                username,
                status: "deleted",
                lastEmailError: null,
                warningTokenHash: null,
                deletedAt: sql`datetime('now')`,
                updatedAt: sql`datetime('now')`,
            })
            .where(eq(inactiveAccountDeletion.id, lifecycleId));
    }

    static async deleteRowsForUser(userId: number) {
        await getDbClient()
            .delete(inactiveAccountDeletion)
            .where(eq(inactiveAccountDeletion.userId, userId));
    }

    static async getInactiveAccountDeletionAdminOverview(data: SearchType) {
        const search = data.search ?? "";
        const searchCondition = search ? like(inactiveAccountDeletion.username, `%${search}%`) : undefined;

        const stats = getDbClient()
            .select({
                warned: sql<number>`SUM(CASE WHEN ${inactiveAccountDeletion.status} = 'warned' THEN 1 ELSE 0 END)`,
                deleted: sql<number>`SUM(CASE WHEN ${inactiveAccountDeletion.status} = 'deleted' THEN 1 ELSE 0 END)`,
                resurrected: sql<number>`SUM(CASE WHEN ${inactiveAccountDeletion.status} = 'resurrected' THEN 1 ELSE 0 END)`,
                retrying: sql<number>`SUM(CASE WHEN ${inactiveAccountDeletion.status} = 'mail_failed' AND ${inactiveAccountDeletion.emailRetryCount} < 3 THEN 1 ELSE 0 END)`,
                mailFailed: sql<number>`SUM(CASE WHEN ${inactiveAccountDeletion.status} = 'mail_failed' AND ${inactiveAccountDeletion.emailRetryCount} >= 3 THEN 1 ELSE 0 END)`,
            })
            .from(inactiveAccountDeletion)
            .get();

        const { items, total, pages } = await paginate({
            page: data.page,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(inactiveAccountDeletion)
                    .where(searchCondition)
                    .get()?.count ?? 0;
            },
            getItems: async ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        id: inactiveAccountDeletion.id,
                        status: inactiveAccountDeletion.status,
                        userId: inactiveAccountDeletion.userId,
                        username: inactiveAccountDeletion.username,
                        deletedAt: inactiveAccountDeletion.deletedAt,
                        lastSeenAt: inactiveAccountDeletion.lastSeenAt,
                        resurrectedAt: inactiveAccountDeletion.resurrectedAt,
                        warningSentAt: inactiveAccountDeletion.warningSentAt,
                        lastEmailError: inactiveAccountDeletion.lastEmailError,
                        emailRetryCount: inactiveAccountDeletion.emailRetryCount,
                        lastEmailAttemptAt: inactiveAccountDeletion.lastEmailAttemptAt,
                        deletionScheduledAt: inactiveAccountDeletion.deletionScheduledAt,
                        createdAt: inactiveAccountDeletion.createdAt,
                        updatedAt: inactiveAccountDeletion.updatedAt,
                    })
                    .from(inactiveAccountDeletion)
                    .where(searchCondition)
                    .orderBy(
                        sql`
                            CASE ${inactiveAccountDeletion.status}
                                WHEN 'warned' THEN 1
                                WHEN 'mail_failed' THEN 2
                                WHEN 'resurrected' THEN 3
                                WHEN 'deleted' THEN 4
                                ELSE 5
                            END
                        `,
                        asc(inactiveAccountDeletion.deletionScheduledAt),
                    )
                    .limit(limit)
                    .offset(offset);
            },
        });

        const warned = stats?.warned ?? 0;
        const deleted = stats?.deleted ?? 0;
        const resurrected = stats?.resurrected ?? 0;

        return {
            items,
            total,
            pages,
            stats: {
                warned,
                deleted,
                resurrected,
                retrying: stats?.retrying ?? 0,
                mailFailed: stats?.mailFailed ?? 0,
                resurrectionRate: warned + resurrected + deleted > 0 ? resurrected / (warned + resurrected + deleted) : 0,
            },
        };
    }
}
