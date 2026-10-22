import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileHistory } from "@/lib/server/mobile/profile";
import { coercedPositiveIntFieldSchema } from "@/lib/schemas/common.schema";

export const Route = createFileRoute("/api/mobile/v1/profile/history")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    getMobileHistory(
                        await resolveMobileProfileUser(request, userId),
                        coercedPositiveIntFieldSchema.parse(new URL(request.url).searchParams.get("page") ?? 1),
                    ),
                ),
        },
    },
});
