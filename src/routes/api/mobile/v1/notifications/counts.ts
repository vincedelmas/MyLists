import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileNotificationCounts} from "@/lib/server/mobile/notifications";


export const Route = createFileRoute("/api/mobile/v1/notifications/counts")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, getMobileNotificationCounts),
        },
    },
});
