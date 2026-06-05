import {mediaTypeUtils} from "@/lib/utils/media-mapping";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getComingNextMedia = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer()
        const mediaTypes = mediaTypeUtils.getComingNextTypes();

        const comingNextData = await Promise.all(
            mediaTypes.map(async (mediaType) => {
                const mediaService = container.registries.mediaService.getService(mediaType);
                const items = await mediaService.getUpcomingMedia(currentUser.id);
                return ({ items, mediaType });
            })
        );

        return comingNextData;
    });
