import {createFileRoute} from "@tanstack/react-router";
import {collectionDetailsReadSchema} from "@/lib/schemas/collections.schema";
import {actOnMobileCommunityCollection, getMobileCommunityCollection, mobileCollectionActionSchema} from "@/lib/server/mobile/collections";
import {mobileRequest} from "@/lib/server/mobile/request";


export const Route = createFileRoute("/api/mobile/v1/collections/detail")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, userId => getMobileCommunityCollection(
                userId,
                collectionDetailsReadSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
            )),
            POST: ({ request }) => mobileRequest(request, async userId => actOnMobileCommunityCollection(
                userId,
                mobileCollectionActionSchema.parse(await request.json()),
            )),
        },
    },
});
