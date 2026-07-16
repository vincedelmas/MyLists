import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {ExpandedListFilters} from "@/lib/types/media-list.types";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {MovieListReadRepository} from "@/lib/server/domain/library/movies/movie-list-read.repository";
import {GameListReadRepository} from "@/lib/server/domain/library/games/game-list-read.repository";
import {BookListReadRepository} from "@/lib/server/domain/library/books/book-list-read.repository";
import {MangaListReadRepository} from "@/lib/server/domain/library/manga/manga-list-read.repository";
import {mediaListAuthorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";
import {mediaListFiltersSchema, mediaListSchema, mediaListSearchFiltersSchema, mediaTypeUsernameSchema, simpleSearchSchema} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";


type ListDataByType = {
    [MediaType.SERIES]: Awaited<ReturnType<TvListReadRepository["getMediaList"]>>;
    [MediaType.ANIME]: Awaited<ReturnType<TvListReadRepository["getMediaList"]>>;
    [MediaType.MOVIES]: Awaited<ReturnType<MovieListReadRepository["getMediaList"]>>;
    [MediaType.GAMES]: Awaited<ReturnType<GameListReadRepository["getMediaList"]>>;
    [MediaType.BOOKS]: Awaited<ReturnType<BookListReadRepository["getMediaList"]>>;
    [MediaType.MANGA]: Awaited<ReturnType<MangaListReadRepository["getMediaList"]>>;
};


type MediaListItemResponse = {
    [K in MediaType]: {
        item: Omit<ListDataByType[K]["items"][number], "favorite"> & { favorite: boolean; kind: K };
    }
}[MediaType]["item"];


type MediaListResponse = {
    results: {
        items: MediaListItemResponse[];
        pagination: ListDataByType[MediaType]["pagination"];
    };
    mediaType: MediaType;
    userData: { id: number };
};


export const getUserListHeaderSF = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .validator(mediaTypeUsernameSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const header = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME
            ? await container.features.tvListReaders[mediaType].getListHeader(targetUser.id)
            : mediaType === MediaType.MOVIES
                ? await container.features.movieListReader.getListHeader(targetUser.id)
                : mediaType === MediaType.GAMES
                    ? await container.features.gameListReader.getListHeader(targetUser.id)
                    : mediaType === MediaType.BOOKS
                        ? await container.features.bookListReader.getListHeader(targetUser.id)
                        : await container.features.mangaListReader.getListHeader(targetUser.id);
        if (!header) throw notFound();

        if (currentUser && currentUser.id !== targetUser.id) {
            await userService.incrementMediaTypeView(targetUser.id, mediaType);
        }

        return header;
    })


export const getMediaListSF = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSchema)
    .handler(async ({ data, context: { currentUser, user, mediaListAccessScope } }): Promise<MediaListResponse> => {
        const { mediaType, args } = data;
        const container = await getContainer();

        const targetUserId = user.id;
        const userService = container.services.user;
        const currentUserId = currentUser?.id ? currentUser.id : undefined;

        if (currentUser && currentUser.id !== targetUserId) {
            await userService.incrementMediaTypeView(targetUserId, mediaType);
        }

        const discriminatedResults = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME
            ? withKind(await container.features.tvListReaders[mediaType].getMediaList(currentUserId, mediaListAccessScope, args), mediaType)
            : mediaType === MediaType.MOVIES
                ? withKind(await container.features.movieListReader.getMediaList(currentUserId, mediaListAccessScope, args), MediaType.MOVIES)
                : mediaType === MediaType.GAMES
                    ? withKind(await container.features.gameListReader.getMediaList(currentUserId, mediaListAccessScope, args), MediaType.GAMES)
                    : mediaType === MediaType.BOOKS
                        ? withKind(await container.features.bookListReader.getMediaList(currentUserId, mediaListAccessScope, args), MediaType.BOOKS)
                        : withKind(await container.features.mangaListReader.getMediaList(currentUserId, mediaListAccessScope, args), MediaType.MANGA);

        return {
            results: discriminatedResults,
            mediaType,
            userData: { id: user.id },
        } as MediaListResponse;
    });


const withKind = <T extends { items: object[] }, K extends MediaType>(results: T, kind: K) => ({
    ...results,
    items: results.items.map((item) => ({ ...item, kind })),
});


export const getTagsViewFn = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaTypeUsernameSchema.extend({ search: simpleSearchSchema }))
    .handler(async ({ data: { mediaType, search }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvListReaders[mediaType].getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieListReader.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameListReader.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookListReader.getTagsView(mediaListAccessScope, search);
        }
        if (mediaType === MediaType.MANGA) {
            return container.features.mangaListReader.getTagsView(mediaListAccessScope, search);
        }

        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaListFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListFiltersSchema)
    .handler(async ({ data: { mediaType }, context: { mediaListAccessScope } }): Promise<ExpandedListFilters> => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvListReaders[mediaType].getListFilters(mediaListAccessScope);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieListReader.getListFilters(mediaListAccessScope);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameListReader.getListFilters(mediaListAccessScope);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookListReader.getListFilters(mediaListAccessScope);
        }
        if (mediaType === MediaType.MANGA) {
            return container.features.mangaListReader.getListFilters(mediaListAccessScope);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaListSearchFilters = createServerFn({ method: "GET" })
    .middleware([mediaListAuthorizationMiddleware])
    .validator(mediaListSearchFiltersSchema)
    .handler(async ({ data: { mediaType, query, job }, context: { mediaListAccessScope } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvListReaders[mediaType].getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieListReader.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameListReader.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookListReader.getSearchListFilters(mediaListAccessScope, query, job);
        }
        if (mediaType === MediaType.MANGA) {
            return container.features.mangaListReader.getSearchListFilters(mediaListAccessScope, query, job);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });
