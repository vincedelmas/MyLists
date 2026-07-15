import {createServerFn} from "@tanstack/react-start";
import {mediaTypeUtils} from "@/lib/utils/media-mapping";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getComingNextMedia = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer()
        const settings = await container.services.user.getMinimalUserSettings(currentUser.id);
        const activeMediaTypes = new Set(settings.filter(({ active }) => active).map(({ mediaType }) => mediaType));
        const mediaTypes = mediaTypeUtils.getComingNextTypes().filter((mediaType) => activeMediaTypes.has(mediaType));

        const comingNextData = await Promise.all(
            mediaTypes.map(async (mediaType) => {
                const mediaService = container.registries.mediaService.get(mediaType);
                const items = await mediaService.getUpcomingMedia(currentUser.id);
                return ({ items, mediaType });
            })
        );

        return comingNextData;
    });
