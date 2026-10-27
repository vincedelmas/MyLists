import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {
    getMobileNotifications,
    notificationTypeSchema,
    actOnMobileNotification,
    mobileNotificationActionSchema,
} from "@/lib/server/mobile/notifications";


export const Route = createFileRoute("/api/mobile/v1/notifications/")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, (userId) =>
                    getMobileNotifications(
                        userId,
                        notificationTypeSchema.parse(new URL(request.url).searchParams.get("type") ?? "media"),
                    ),
                ),
            POST: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    actOnMobileNotification(userId, mobileNotificationActionSchema.parse(await request.json())),
                ),
        },
    },
});
