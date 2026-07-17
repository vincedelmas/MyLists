import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {mediaListAuthorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";
import {mediaListFiltersSchema, mediaListSchema, mediaListSearchFiltersSchema, mediaTypeUsernameSchema, simpleSearchSchema} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {MediaListPage, validateMediaListFiltersResult, validateMediaListPage} from "@/lib/contracts/media/lists";


export const getUserListHeaderSF = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .validator(mediaTypeUsernameSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const header = await container.media.get(mediaType).library.list.getListHeader(targetUser.id);
        if (!header) throw notFound();

        if (currentUser && currentUser.id !== targetUser.id) {
            await container.account.profileViews.recordMediaChannelView(targetUser.id, mediaType);
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
            await container.account.profileViews.recordMediaChannelView(targetUserId, data.mediaType);
        }

        if (data.mediaType === MediaType.SERIES) {
            return listResponse(await container.media.get(MediaType.SERIES).library.list
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.ANIME) {
            return listResponse(await container.media.get(MediaType.ANIME).library.list
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.MOVIES) {
            return listResponse(await container.media.get(MediaType.MOVIES).library.list
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.GAMES) {
            return listResponse(await container.media.get(MediaType.GAMES).library.list
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.BOOKS) {
            return listResponse(await container.media.get(MediaType.BOOKS).library.list
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        return listResponse(await container.media.get(MediaType.MANGA).library.list
            .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
    });


const listResponse = <T extends MediaListPage>(results: T, userId: number) => ({
    results: validateMediaListPage(results),
    userData: { id: userId },
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

        return validateMediaListFiltersResult(
            await container.media.get(mediaType).library.list.getListFilters(mediaListAccessScope),
        );
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.list
            .getSearchListFilters(mediaListAccessScope, query, job);
    });
