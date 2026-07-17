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
        const header = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME
            ? await container.media.lists.tv[mediaType].getListHeader(targetUser.id)
            : mediaType === MediaType.MOVIES
                ? await container.media.lists.movies.getListHeader(targetUser.id)
                : mediaType === MediaType.GAMES
                    ? await container.media.lists.games.getListHeader(targetUser.id)
                    : mediaType === MediaType.BOOKS
                        ? await container.media.lists.books.getListHeader(targetUser.id)
                        : await container.media.lists.manga.getListHeader(targetUser.id);
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
            return listResponse(await container.media.lists.tv[MediaType.SERIES]
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.ANIME) {
            return listResponse(await container.media.lists.tv[MediaType.ANIME]
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.MOVIES) {
            return listResponse(await container.media.lists.movies
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.GAMES) {
            return listResponse(await container.media.lists.games
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        if (data.mediaType === MediaType.BOOKS) {
            return listResponse(await container.media.lists.books
                .getMediaList(currentUserId, mediaListAccessScope, data.args), user.id);
        }
        return listResponse(await container.media.lists.manga
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
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.media.lists.tv[mediaType].getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.media.lists.movies.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.GAMES) {
            return container.media.lists.games.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.media.lists.books.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.MANGA) {
            return container.media.lists.manga.getTagsView(mediaListAccessScope, search);
        }

        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaListFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListFiltersSchema)
    .handler(async ({ data: { mediaType }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return validateMediaListFiltersResult(await container.media.lists.tv[mediaType].getListFilters(mediaListAccessScope));
        }
        if (mediaType === MediaType.MOVIES) {
            return validateMediaListFiltersResult(await container.media.lists.movies.getListFilters(mediaListAccessScope));
        }
        if (mediaType === MediaType.GAMES) {
            return validateMediaListFiltersResult(await container.media.lists.games.getListFilters(mediaListAccessScope));
        }
        if (mediaType === MediaType.BOOKS) {
            return validateMediaListFiltersResult(await container.media.lists.books.getListFilters(mediaListAccessScope));
        }
        if (mediaType === MediaType.MANGA) {
            return validateMediaListFiltersResult(await container.media.lists.manga.getListFilters(mediaListAccessScope));
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.media.lists.tv[mediaType].getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.media.lists.movies.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.GAMES) {
            return container.media.lists.games.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.media.lists.books.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.MANGA) {
            return container.media.lists.manga.getSearchListFilters(mediaListAccessScope, query, job);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });
