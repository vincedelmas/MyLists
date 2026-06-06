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
        const mediaRegistry = container.registries.mediaService;
        const mediaTypes = mediaTypeUtils.getTypesForNotifications();
        const notificationsService = container.services.notifications;

        for (const mediaType of mediaTypes) {
            await ctx.step(`process-${mediaType}`, async () => {
                const mediaService = mediaRegistry.getService(mediaType);
                const allMediaToNotify = await mediaService.getUpcomingMedia(undefined, true);

                ctx.metric(`${mediaType}.found`, allMediaToNotify.length);
                if (allMediaToNotify.length === 0) {
                    ctx.info(`No upcoming ${mediaType} found to notify.`);
                    return;
                }

                await notificationsService.createMediaNotifications(mediaType, allMediaToNotify);
            })
        }
    },
});
