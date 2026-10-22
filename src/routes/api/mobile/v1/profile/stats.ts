import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileStats, statsTabSchema } from "@/lib/server/mobile/profile";

export const Route = createFileRoute("/api/mobile/v1/profile/stats")({
    server: {
        handlers: {
            GET: ({ request }) => {
                return mobileRequest(request, async (userId) =>
                    getMobileStats(
                        await resolveMobileProfileUser(request, userId),
                        statsTabSchema.parse(new URL(request.url).searchParams.get("tab") ?? undefined),
                    ),
                );
            },
        },
    },
});
