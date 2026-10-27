import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {getMobileMonthlyActivityStats, mobileMonthlyActivityStatsSchema} from "@/lib/server/mobile/monthly-activity";


export const Route = createFileRoute("/api/mobile/v1/profile/monthly-activity/stats")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, async viewerId => getMobileMonthlyActivityStats(
                await resolveMobileProfileUser(request, viewerId), mobileMonthlyActivityStatsSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
            )),
        }
    }
});
