import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {mediaTypeFieldSchema} from "@/lib/schemas/common.schema";
import {getMobileListFilterOptions} from "@/lib/server/mobile/list-filters";


export const Route = createFileRoute("/api/mobile/v1/lists/$mediaType/filters")({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                mobileRequest(request, async (viewerId) =>
                    getMobileListFilterOptions(
                        await resolveMobileProfileUser(request, viewerId),
                        mediaTypeFieldSchema.parse(params.mediaType),
                    ),
                ),
        },
    },
});
