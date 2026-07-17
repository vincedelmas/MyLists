import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {MediaModule} from "@/lib/server/domain/media/media-module.registry";


type UpcomingNotificationMediaModule = Extract<MediaModule, { notifications: { upcoming: unknown } }>;


const supportsUpcomingNotifications = (mediaModule: MediaModule): mediaModule is UpcomingNotificationMediaModule => {
    return "notifications" in mediaModule;
}


export const createMediaNotificationsTask = defineTask({
    name: "create-media-notifications" as const,
    visibility: "admin",
    description: "Create and send notifications for upcoming media releases",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaModules = container.media.values().filter(supportsUpcomingNotifications);

        for (const mediaModule of mediaModules) {
            await ctx.step(`process-${mediaModule.kind}`, async () => {
                const allMediaToNotify = await mediaModule.notifications.upcoming.candidates();

                ctx.metric(`${mediaModule.kind}.found`, allMediaToNotify.length);
                if (allMediaToNotify.length === 0) {
                    ctx.info(`No upcoming ${mediaModule.kind} found to notify.`);
                    return;
                }

                await mediaModule.notifications.upcoming.create(allMediaToNotify);
            })
        }
    },
});
