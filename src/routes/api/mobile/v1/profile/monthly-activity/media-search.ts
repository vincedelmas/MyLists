import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {monthlyActivityMediaSearchSchema} from "@/lib/schemas/activity.schema";
import {searchMobileActivityMedia} from "@/lib/server/mobile/monthly-activity";


export const Route = createFileRoute("/api/mobile/v1/profile/monthly-activity/media-search")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, async viewerId => searchMobileActivityMedia(
                await resolveMobileProfileUser(request, viewerId, { ownerOnly: true }), monthlyActivityMediaSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
            )),
        }
    }
});
