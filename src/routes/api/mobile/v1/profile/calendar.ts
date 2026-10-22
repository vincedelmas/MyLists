import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileCalendar } from "@/lib/server/mobile/calendar";
import { releaseCalendarRangeSchema } from "@/lib/schemas/release-calendar.schema";

export const Route = createFileRoute("/api/mobile/v1/profile/calendar")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, (userId) =>
                    getMobileCalendar(
                        userId,
                        releaseCalendarRangeSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                    ),
                ),
        },
    },
});
