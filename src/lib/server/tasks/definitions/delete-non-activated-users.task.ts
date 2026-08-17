import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const deleteNonActivatedUsersTask = defineTask({
    name: "delete-non-activated-users" as const,
    visibility: "admin",
    description: "Delete user accounts never activated (> 1 week)",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const accountRepository = container.repositories.account;

        await ctx.step("delete-non-activated", async () => {
            const deletedCount = await accountRepository.deleteNonActivatedOldUsers();
            ctx.metric("users.deleted", deletedCount);
            ctx.info(`Cleaned up ${deletedCount} inactive accounts.`);
        });
    },
});
