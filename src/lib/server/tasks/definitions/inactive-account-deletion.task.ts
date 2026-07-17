import {z} from "zod";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";
import {randomBytes} from "node:crypto";
import {sendEmail} from "@/lib/utils/mail-sender";
import {formatDate} from "@/lib/utils/date-formatting";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {signCookieValue} from "@/lib/utils/signed-cookies";


export const inactiveAccountDeletionTask = defineTask({
    name: "inactive-account-deletion" as const,
    visibility: "admin",
    description: "Warn and delete accounts inactive for 2 years",
    inputSchema: z.object({
        maxEmailsPerRun: z.coerce.number().int().positive().max(500).default(100),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const inactiveAccountQuery = container.inactiveAccounts.query;
        const inactiveAccountCommands = container.inactiveAccounts.commands;

        await ctx.step("mark-resurrected-users", async () => {
            const resurrectedCount = await inactiveAccountCommands.markResurrectedUsers();
            ctx.metric("accounts.resurrected", resurrectedCount);
        });

        await ctx.step("send-warning-emails", async () => {
            const targets = await inactiveAccountQuery.getWarningTargets(input.maxEmailsPerRun, 3);
            ctx.metric("accounts.warning.targets", targets.length);

            for (const target of targets) {
                const token = randomBytes(32).toString("hex");
                const warningTokenHash = await signCookieValue(token, serverEnv.BETTER_AUTH_SECRET);

                try {
                    await sendEmail({
                        to: target.email,
                        username: target.username,
                        template: "inactiveAccountDeletion",
                        deletionDate: formatDate(target.deletionScheduledAt),
                        subject: "MyLists - Keep your account before it is deleted",
                        link: `${clientEnv.VITE_BASE_URL}/reactivate-account?token=${token}`,
                    });

                    await inactiveAccountCommands.warningSent({
                        warningTokenHash,
                        userId: target.userId,
                        username: target.username,
                        lastSeenAt: target.lastSeenAt,
                        lifecycleId: target.lifecycleId,
                        deletionScheduledAt: target.deletionScheduledAt,
                    });

                    ctx.increment("accounts.warning.sent");
                }
                catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);

                    await inactiveAccountCommands.warningFailed({
                        errorMessage,
                        userId: target.userId,
                        username: target.username,
                        lastSeenAt: target.lastSeenAt,
                        lifecycleId: target.lifecycleId,
                        deletionScheduledAt: target.deletionScheduledAt,
                    });

                    ctx.increment("accounts.warning.failed");
                    ctx.warn("Failed to send inactive account warning", {
                        error: errorMessage,
                        userId: target.userId,
                        attempt: target.emailRetryCount + 1,
                    });
                }
            }
        });

        await ctx.step("delete-due-accounts", async () => {
            const targets = await inactiveAccountQuery.getDeletionTargets(3);
            ctx.metric("accounts.deletion.targets", targets.length);

            for (const target of targets) {
                const deleted = await container.account.deletion.delete({
                    type: "inactive",
                    userId: target.userId,
                    username: target.username,
                    lifecycleId: target.lifecycleId,
                });

                if (deleted) ctx.increment("accounts.deleted");
            }
        });
    },
});
