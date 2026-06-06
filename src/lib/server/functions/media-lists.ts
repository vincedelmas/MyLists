import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {tryNotFound} from "@/lib/utils/try-not-found";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaListDataByType} from "@/lib/server/domain/media/base/base.repository";
import {mediaListFiltersSchema, mediaListSchema, mediaListSearchFiltersSchema} from "@/lib/schemas";
import {authorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserListHeaderSF = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .inputValidator(tryNotFound(z.object({ username: z.string(), mediaType: z.enum(MediaType) })))
    .handler(async ({ data: { mediaType }, context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        const userHasMediaTypeActive = await userService.hasActiveMediaType(targetUser.id, mediaType);
        if (!userHasMediaTypeActive) {
            throw new FormattedError("MediaType not-activated");
        }

        if (currentUser && currentUser.id !== targetUser.id) {
            await userService.incrementMediaTypeView(targetUser.id, mediaType);
        }

        return { timeSpent: targetUser.userMediaSettings.find((s) => s.mediaType === mediaType)?.timeSpent ?? 0 };
    })


export const getMediaListSF = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .inputValidator(tryNotFound(mediaListSchema))
    .handler(async ({ data, context: { currentUser, user } }) => {
        const { mediaType, args } = data;
        const container = await getContainer();

        const targetUserId = user.id;
        const userService = container.services.user;
        const currentUserId = currentUser?.id ? currentUser.id : undefined;

        if (currentUser && currentUser.id !== targetUserId) {
            await userService.incrementMediaTypeView(targetUserId, mediaType);
        }

        const userHasMediaTypeActive = await userService.hasActiveMediaType(targetUserId, data.mediaType);
        if (!userHasMediaTypeActive) {
            throw new FormattedError("MediaType not-activated");
        }

        const mediaService = container.registries.mediaService.getService(mediaType);
        const results = await mediaService.getMediaList(currentUserId, targetUserId, args) as MediaListDataByType[typeof mediaType];

        return {
            results,
            mediaType,
            userData: { id: user.id },
        };
    });


export const getTagsViewFn = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .inputValidator(z.object({ username: z.string(), mediaType: z.enum(MediaType) }))
    .handler(async ({ data: { mediaType }, context: { user } }) => {
        const targetUserId = user.id;
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);

        return mediaService.getTagsView(targetUserId);
    });


export const getMediaListFilters = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .inputValidator(mediaListFiltersSchema)
    .handler(async ({ data: { mediaType }, context: { user } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getListFilters(user.id);
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .inputValidator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { user } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getSearchListFilters(user.id, query, job);
    });
