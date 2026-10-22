import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { resolveMobileProfileUser } from "@/lib/server/mobile/profile-access";
import { mediaListSearchFiltersSchema } from "@/lib/schemas/media-lists.schema";
import { searchMobileListFilterOptions } from "@/lib/server/mobile/list-filters";
export const Route = createFileRoute("/api/mobile/v1/lists/$mediaType/filter-search")({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                mobileRequest(request, async (viewerId) => {
                    const userId = await resolveMobileProfileUser(request, viewerId);
                    const input = mediaListSearchFiltersSchema.parse({
                        ...Object.fromEntries(new URL(request.url).searchParams),
                        mediaType: params.mediaType,
                    });
                    return searchMobileListFilterOptions(userId, input.mediaType, input.field, input.query);
                }),
        },
    },
});
