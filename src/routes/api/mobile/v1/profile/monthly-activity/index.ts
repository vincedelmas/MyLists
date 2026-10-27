import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {getMobileMonthlyActivity, mobileMonthlyActivityMutationSchema, mobileMonthlyActivitySchema, mutateMobileMonthlyActivity} from "@/lib/server/mobile/monthly-activity";

export const Route = createFileRoute("/api/mobile/v1/profile/monthly-activity/")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, async viewerId => getMobileMonthlyActivity(
                await resolveMobileProfileUser(request, viewerId),
                mobileMonthlyActivitySchema.parse(Object.fromEntries(new URL(request.url).searchParams)), viewerId,
            )),
            POST: ({ request }) => mobileRequest(request, async viewerId => mutateMobileMonthlyActivity(
                await resolveMobileProfileUser(request, viewerId, { ownerOnly: true }),
                mobileMonthlyActivityMutationSchema.parse(await request.json()),
            )),
        }
    },
});
