import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileCalendar} from "@/lib/server/mobile/calendar";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {releaseCalendarRangeSchema} from "@/lib/schemas/release-calendar.schema";


export const Route = createFileRoute("/api/mobile/v1/profile/calendar")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    getMobileCalendar(
                        await resolveMobileProfileUser(request, userId),
                        releaseCalendarRangeSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                        userId,
                    ),
                ),
        },
    },
});
