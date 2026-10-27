import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileSocial, actOnMobileSocial, socialListSchema, socialActionSchema} from "@/lib/server/mobile/social";


export const Route = createFileRoute("/api/mobile/v1/social/")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    getMobileSocial(
                        await resolveMobileProfileUser(request, userId),
                        socialListSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                        userId,
                    ),
                ),
            POST: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    actOnMobileSocial(userId, socialActionSchema.parse(await request.json())),
                ),
        },
    },
});
