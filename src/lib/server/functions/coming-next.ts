import {createServerFn} from "@tanstack/react-start";
import {mediaTypeUtils} from "@/lib/utils/media-mapping";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getComingNextMedia = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer()
        const activeMediaTypes = new Set(await container.features.profileChannelAccess.getEnabledKinds(currentUser.id));
        const mediaTypes = mediaTypeUtils.getComingNextTypes().filter((mediaType) => activeMediaTypes.has(mediaType));

        const comingNextData = await Promise.all(
            mediaTypes.map(async (mediaType) => {
                const items = await container.features.upcomingMediaCatalog.getForOwner(mediaType, currentUser.id);
                return ({ items, mediaType });
            })
        );

        return comingNextData;
    });
