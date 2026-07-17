import {MediaType} from "@/lib/utils/enums";
import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {mediaListAuthorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";
import {mediaListFiltersSchema, mediaListSchema, mediaListSearchFiltersSchema, mediaTypeUsernameSchema, simpleSearchSchema} from "@/lib/schemas";


export const getUserListHeaderSF = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .validator(mediaTypeUsernameSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser, targetUser } }) => {
        const container = await getContainer();

        const header = await container.media.get(mediaType).library.list.getListHeader(targetUser.id);
        if (!header) throw notFound();

        if (currentUser && currentUser.id !== targetUser.id) {
            container.account.profileViews.recordMediaChannelView(targetUser.id, mediaType);
        }

        return header;
    })


export const getMediaListSF = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSchema)
    .handler(async ({ data, context: { currentUser, user, mediaListAccessScope } }) => {
        const container = await getContainer();

        const targetUserId = user.id;
        const currentUserId = currentUser?.id ? currentUser.id : undefined;

        if (currentUser && currentUser.id !== targetUserId) {
            container.account.profileViews.recordMediaChannelView(targetUserId, data.mediaType);
        }

        if (data.mediaType === MediaType.SERIES) {
            const results = await container.media.get(MediaType.SERIES).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
            return { results, userData: { id: user.id } };
        }
        if (data.mediaType === MediaType.ANIME) {
            const results = await container.media.get(MediaType.ANIME).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
            return { results, userData: { id: user.id } };
        }
        if (data.mediaType === MediaType.MOVIES) {
            const results = await container.media.get(MediaType.MOVIES).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
            return { results, userData: { id: user.id } };
        }
        if (data.mediaType === MediaType.GAMES) {
            const results = await container.media.get(MediaType.GAMES).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
            return { results, userData: { id: user.id } };
        }
        if (data.mediaType === MediaType.BOOKS) {
            const results = await container.media.get(MediaType.BOOKS).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
            return { results, userData: { id: user.id } };
        }

        const results = await container.media.get(MediaType.MANGA).library.list.getMediaList(currentUserId, mediaListAccessScope, data.args);
        return { results, userData: { id: user.id } };
    });


export const getTagsViewFn = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaTypeUsernameSchema.extend({ search: simpleSearchSchema }))
    .handler(async ({ data: { mediaType, search }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.list.getTagsView(mediaListAccessScope, search);
    });


export const getMediaListFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListFiltersSchema)
    .handler(async ({ data: { mediaType }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.list.getListFilters(mediaListAccessScope);
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.list.getSearchListFilters(mediaListAccessScope, query, job);
    });
