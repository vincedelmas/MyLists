import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileRecentAchievements } from "@/lib/server/mobile/profile";

export const Route = createFileRoute("/api/mobile/v1/profile/achievements/recent")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (viewerId) =>
                    getMobileRecentAchievements(await resolveMobileProfileUser(request, viewerId)),
                ),
        },
    },
});
