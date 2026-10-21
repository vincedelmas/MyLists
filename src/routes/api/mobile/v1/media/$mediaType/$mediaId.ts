import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {addMediaToListSchema, updateUserMediaSchema} from "@/lib/schemas/user-media.schema";
import {mediaParamsSchema, getMobileMedia, addMobileMedia, updateMobileMedia, removeMobileMedia} from "@/lib/server/mobile/media";


export const Route = createFileRoute("/api/mobile/v1/media/$mediaType/$mediaId")({
    server: {
        handlers: {
            GET: ({ request, params }) => {
                return mobileRequest(request, (userId) => getMobileMedia(userId, mediaParamsSchema.parse(params)))
            },
            POST: ({ request, params }) => {
                return mobileRequest(request, async (userId) => addMobileMedia(userId, addMediaToListSchema.parse({ ...(await request.json()), ...params })));
            },
            PATCH: ({ request, params }) =>
                mobileRequest(request, async (userId) =>
                    updateMobileMedia(userId, updateUserMediaSchema.parse({ ...(await request.json()), ...params })),
                ),
            DELETE: ({ request, params }) =>
                mobileRequest(request, (userId) => removeMobileMedia(userId, mediaParamsSchema.parse(params))),
        },
    },
});
