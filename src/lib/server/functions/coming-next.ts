import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import type {MediaModule} from "@/lib/server/domain/media/media-module.registry"


type UpcomingMediaModule = Extract<MediaModule, { library: { upcoming: { forOwner: unknown } } }>;

const supportsUpcomingMedia = (mediaModule: MediaModule): mediaModule is UpcomingMediaModule => {
    return "upcoming" in mediaModule.library;
}


export const getComingNextMedia = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer()
        const activeMediaTypes = new Set(await container.profile.channels.getEnabledKinds(currentUser.id));
        const mediaModules = container.media.values()
            .filter(supportsUpcomingMedia)
            .filter((mediaModule) => activeMediaTypes.has(mediaModule.kind));

        const comingNextData = await Promise.all(
            mediaModules.map(async (mediaModule) => {
                const items = await mediaModule.library.upcoming.forOwner(currentUser.id);
                return ({ items, mediaType: mediaModule.kind });
            })
        );

        return comingNextData;
    });
