import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {RELEASE_NOTIFICATION_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";


export const createMediaNotificationsTask = defineTask({
    name: "create-media-notifications" as const,
    visibility: "admin",
    description: "Create and send notifications for upcoming media releases",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaRegistry = container.registries.mediaService;
        const notificationsService = container.services.notifications;

        for (const mediaType of RELEASE_NOTIFICATION_MEDIA_TYPES) {
            await ctx.step(`process-${mediaType}`, async () => {
                const mediaService = mediaRegistry.get(mediaType);
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
