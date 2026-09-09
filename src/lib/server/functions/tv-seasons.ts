import {notFound} from "@tanstack/react-router";
import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {tvSeasonsQuerySchema} from "@/lib/schemas/tv-seasons.schema";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getTvSeasons = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(tvSeasonsQuerySchema)
    .handler(async ({ data: { userId, mediaId, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();

        // Owners can edit from details
        if (currentUser?.id !== userId) {
            const owner = await container.services.account.getUserById(userId);
            if (!owner || !resolveMediaTypeActive(owner.userMediaSettings, mediaType)) throw notFound();

            const decision = await container.services.authorization.decideProfile(toActor(currentUser), owner);
            if (!decision.allowed) throw notFound();
        }

        return container.registries.mediaService.get(mediaType).getUserSeasons(userId, mediaId);
    });
