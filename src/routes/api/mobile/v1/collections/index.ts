import {createFileRoute} from "@tanstack/react-router";
import {collectionsBrowseFiltersSchema} from "@/lib/schemas/collections.schema";
import {getMobileCommunityCollections} from "@/lib/server/mobile/collections";
import {mobileRequest} from "@/lib/server/mobile/request";


export const Route = createFileRoute("/api/mobile/v1/collections/")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, userId => getMobileCommunityCollections(
                userId,
                collectionsBrowseFiltersSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
            )),
        },
    },
});
