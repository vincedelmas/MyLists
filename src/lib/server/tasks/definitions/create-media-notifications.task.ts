import {z} from "zod";
import {mediaTypeUtils} from "@/lib/utils/media-mapping";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const createMediaNotificationsTask = defineTask({
    name: "create-media-notifications" as const,
    visibility: "admin",
    description: "Create and send notifications for upcoming media releases",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaTypes = mediaTypeUtils.getTypesForNotifications();
        const notificationCommands = container.notifications.commands;

        for (const mediaType of mediaTypes) {
            await ctx.step(`process-${mediaType}`, async () => {
                const allMediaToNotify = await container.media.get(mediaType).library.upcoming.forNotifications();

                ctx.metric(`${mediaType}.found`, allMediaToNotify.length);
                if (allMediaToNotify.length === 0) {
                    ctx.info(`No upcoming ${mediaType} found to notify.`);
                    return;
                }

                await notificationCommands.createMediaNotifications(mediaType, allMediaToNotify);
            })
        }
    },
});
