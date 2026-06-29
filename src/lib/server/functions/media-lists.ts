import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {MediaListDataByType} from "@/lib/server/domain/media/base/base.repository";
import {authorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";
import {mediaListFiltersSchema, mediaListSchema, mediaListSearchFiltersSchema, mediaTypeUsernameSchema, simpleSearchSchema} from "@/lib/schemas";


export const getUserListHeaderSF = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .validator(mediaTypeUsernameSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        const userHasMediaTypeActive = await userService.hasActiveMediaType(targetUser.id, mediaType);
        if (!userHasMediaTypeActive) throw notFound();

        if (currentUser && currentUser.id !== targetUser.id) {
            await userService.incrementMediaTypeView(targetUser.id, mediaType);
        }

        return { timeSpent: targetUser.userMediaSettings.find((s) => s.mediaType === mediaType)?.timeSpent ?? 0 };
    })


export const getMediaListSF = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(mediaListSchema)
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
        if (!userHasMediaTypeActive) throw notFound();

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
    .validator(mediaTypeUsernameSchema.extend({ search: simpleSearchSchema }))
    .handler(async ({ data: { mediaType, search }, context: { user } }) => {
        const targetUserId = user.id;
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);

        return mediaService.getTagsView(targetUserId, search);
    });


export const getMediaListFilters = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(mediaListFiltersSchema)
    .handler(async ({ data: { mediaType }, context: { user } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getListFilters(user.id);
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { user } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getSearchListFilters(user.id, query, job);
    });
