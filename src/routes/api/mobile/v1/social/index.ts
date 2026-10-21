import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileSocial, actOnMobileSocial, socialListSchema, socialActionSchema} from "@/lib/server/mobile/social";

export const Route = createFileRoute("/api/mobile/v1/social/")({
    server: {
        handlers: {
            GET: ({request}) =>
                mobileRequest(request, (userId) =>
                    getMobileSocial(
                        userId,
                        socialListSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                    ),
                ),
            POST: ({request}) =>
                mobileRequest(request, async (userId) =>
                    actOnMobileSocial(userId, socialActionSchema.parse(await request.json())),
                ),
        },
    },
});
