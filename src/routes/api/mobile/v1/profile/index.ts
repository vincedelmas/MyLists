import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileProfile } from "@/lib/server/mobile/profile";

export const Route = createFileRoute("/api/mobile/v1/profile/")({
    server: {
        handlers: {
            GET: ({ request }) => {
                return mobileRequest(request, async (viewerId) =>
                    getMobileProfile(await resolveMobileProfileUser(request, viewerId)),
                );
            },
        },
    },
});
