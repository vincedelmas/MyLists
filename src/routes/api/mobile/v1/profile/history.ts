import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileHistory, deleteMobileHistory} from "@/lib/server/mobile/profile";
import {deleteUserUpdatesSchema} from "@/lib/schemas/user-media.schema";
import {coercedPositiveIntFieldSchema, optionalTrimmedSearchFieldSchema} from "@/lib/schemas/common.schema";


export const Route = createFileRoute("/api/mobile/v1/profile/history")({
    server: {
        handlers: {
            DELETE: ({ request }) => mobileRequest(request, async (userId) =>
                deleteMobileHistory(userId, deleteUserUpdatesSchema.parse(await request.json())),
            ),
            GET: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    getMobileHistory(
                        await resolveMobileProfileUser(request, userId),
                        coercedPositiveIntFieldSchema.parse(new URL(request.url).searchParams.get("page") ?? 1),
                        optionalTrimmedSearchFieldSchema.parse(new URL(request.url).searchParams.get("search") ?? undefined),
                    ),
                ),
        },
    },
});
