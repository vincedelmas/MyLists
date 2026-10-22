import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { mediaTypeFieldSchema } from "@/lib/schemas/common.schema";
import { getMobileList, listInputSchema } from "@/lib/server/mobile/media";

export const Route = createFileRoute("/api/mobile/v1/lists/$mediaType")({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                mobileRequest(request, async (userId) =>
                    getMobileList(
                        await resolveMobileProfileUser(request, userId),
                        mediaTypeFieldSchema.parse(params.mediaType),
                        listInputSchema.parse(JSON.parse(new URL(request.url).searchParams.get("filters") ?? "{}")),
                        userId,
                    ),
                ),
        },
    },
});
