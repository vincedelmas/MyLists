import * as z from "zod";
import {GamesPlatformsEnum, MediaType, RatingSystemType, Status,} from "@/lib/utils/enums";
import {optionalCoercedBooleanFieldSchema, optionalSearchFieldSchema, paginationSchema, sortingFieldSchema, usernameFieldSchema,} from "@/lib/schemas/common.schema";
import {TvMediaType} from "@/lib/types/media-kind.types";


const optionalStringArray = z.array(z.string()).optional();
const optionalStatusArray = (statuses: readonly [Status, ...Status[]]) => z.array(z.enum(statuses)).optional();

const commonListArgsShape = {
    ...paginationSchema.shape,
    sorting: sortingFieldSchema,
    search: optionalSearchFieldSchema,
    comment: optionalCoercedBooleanFieldSchema,
    favorite: optionalCoercedBooleanFieldSchema,
    hideCommon: optionalCoercedBooleanFieldSchema,
    genres: optionalStringArray,
    tags: optionalStringArray,
};

const tvStatuses = [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLAN_TO_WATCH] as const;
const movieStatuses = [Status.COMPLETED, Status.PLAN_TO_WATCH] as const;
const gameStatuses = [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY] as const;
const readingStatuses = [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ] as const;

export const tvListArgsSchema = z.object({
    ...commonListArgsShape,
    status: optionalStatusArray(tvStatuses),
    langs: optionalStringArray,
    actors: optionalStringArray,
    networks: optionalStringArray,
    creators: optionalStringArray,
}).strict();

export const movieListArgsSchema = z.object({
    ...commonListArgsShape,
    status: optionalStatusArray(movieStatuses),
    langs: optionalStringArray,
    actors: optionalStringArray,
    directors: optionalStringArray,
}).strict();

export const gameListArgsSchema = z.object({
    ...commonListArgsShape,
    status: optionalStatusArray(gameStatuses),
    companies: optionalStringArray,
    platforms: z.array(z.enum(GamesPlatformsEnum)).optional(),
}).strict();

export const bookListArgsSchema = z.object({
    ...commonListArgsShape,
    status: optionalStatusArray(readingStatuses),
    langs: optionalStringArray,
    authors: optionalStringArray,
}).strict();

export const mangaListArgsSchema = z.object({
    ...commonListArgsShape,
    status: optionalStatusArray(readingStatuses),
    authors: optionalStringArray,
    publishers: optionalStringArray,
}).strict();

const requestVariant = <K extends MediaType, S extends z.ZodType>(mediaType: K, args: S) => z.object({
    mediaType: z.literal(mediaType),
    username: usernameFieldSchema,
    args,
}).strict();

export const mediaListRequestSchema = z.discriminatedUnion("mediaType", [
    requestVariant(MediaType.SERIES, tvListArgsSchema),
    requestVariant(MediaType.ANIME, tvListArgsSchema),
    requestVariant(MediaType.MOVIES, movieListArgsSchema),
    requestVariant(MediaType.GAMES, gameListArgsSchema),
    requestVariant(MediaType.BOOKS, bookListArgsSchema),
    requestVariant(MediaType.MANGA, mangaListArgsSchema),
]);

const listTagSchema = z.object({ id: z.number().int().positive(), name: z.string() }).strict();
const tvSeasonSchema = z.object({
    seasonNumber: z.number().int().positive(),
    episodeCount: z.number().int().nonnegative(),
}).strict();
const tvSeasonRewatchSchema = z.object({
    seasonNumber: z.number().int().positive(),
    count: z.number().int().nonnegative(),
}).strict();
const commonListItemShape = {
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    status: z.enum(Status),
    favorite: z.boolean(),
    comment: z.string().nullable(),
    rating: z.number().min(0).max(10).nullable(),
    customCover: z.string().nullable(),
    addedAt: z.string().nullable(),
    lastUpdated: z.string().nullable(),
    mediaName: z.string(),
    imageCover: z.string(),
    ratingSystem: z.enum(RatingSystemType),
    tags: z.array(listTagSchema),
    common: z.boolean(),
};

const tvListItem = <K extends TvMediaType>(kind: K) => z.object({
    ...commonListItemShape,
    kind: z.literal(kind),
    currentSeason: z.number().int().positive(),
    currentEpisode: z.number().int().nonnegative(),
    watchedEpisodes: z.number().int().nonnegative(),
    rewatches: z.array(tvSeasonRewatchSchema),
    seasons: z.array(tvSeasonSchema),
}).strict();

const seriesListItemSchema = tvListItem(MediaType.SERIES);
const animeListItemSchema = tvListItem(MediaType.ANIME);
const movieListItemSchema = z.object({
    ...commonListItemShape,
    kind: z.literal(MediaType.MOVIES),
    rewatchCount: z.number().int().nonnegative(),
    watchCount: z.number().int().nonnegative(),
}).strict();
const gameListItemSchema = z.object({
    ...commonListItemShape,
    kind: z.literal(MediaType.GAMES),
    playtime: z.number().nonnegative(),
    platform: z.enum(GamesPlatformsEnum).nullable(),
}).strict();
const bookListItemSchema = z.object({
    ...commonListItemShape,
    kind: z.literal(MediaType.BOOKS),
    currentPage: z.number().int().nonnegative().nullable(),
    rereadCount: z.number().int().nonnegative(),
    totalPagesRead: z.number().int().nonnegative(),
    pages: z.number().int().nonnegative(),
}).strict();
const mangaListItemSchema = z.object({
    ...commonListItemShape,
    kind: z.literal(MediaType.MANGA),
    currentChapter: z.number().int().nonnegative(),
    rereadCount: z.number().int().nonnegative(),
    totalChaptersRead: z.number().int().nonnegative(),
    chapters: z.number().int().nonnegative().nullable(),
}).strict();

export const mediaListItemSchema = z.discriminatedUnion("kind", [
    seriesListItemSchema,
    animeListItemSchema,
    movieListItemSchema,
    gameListItemSchema,
    bookListItemSchema,
    mangaListItemSchema,
]);

const paginationResultSchema = z.object({
    page: z.number().int().positive(),
    perPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    totalItems: z.number().int().nonnegative(),
    sorting: z.string(),
    availableSorting: z.array(z.string()),
}).strict();

const listPage = <K extends MediaType, S extends z.ZodType>(kind: K, item: S) => z.object({
    kind: z.literal(kind),
    items: z.array(item),
    pagination: paginationResultSchema,
}).strict();

const seriesListPageSchema = listPage(MediaType.SERIES, seriesListItemSchema);
const animeListPageSchema = listPage(MediaType.ANIME, animeListItemSchema);
const movieListPageSchema = listPage(MediaType.MOVIES, movieListItemSchema);
const gameListPageSchema = listPage(MediaType.GAMES, gameListItemSchema);
const bookListPageSchema = listPage(MediaType.BOOKS, bookListItemSchema);
const mangaListPageSchema = listPage(MediaType.MANGA, mangaListItemSchema);

const mediaListPageSchema = z.discriminatedUnion("kind", [
    seriesListPageSchema,
    animeListPageSchema,
    movieListPageSchema,
    gameListPageSchema,
    bookListPageSchema,
    mangaListPageSchema,
]);

const nameSchema = z.object({ name: z.string() }).strict();
const listFilters = <K extends MediaType, E extends z.ZodRawShape>(kind: K, extra: E) => z.object({
    kind: z.literal(kind),
    genres: z.array(nameSchema),
    tags: z.array(nameSchema),
    ...extra,
}).strict();

const mediaListFiltersResultSchema = z.discriminatedUnion("kind", [
    listFilters(MediaType.SERIES, { langs: z.array(nameSchema) }),
    listFilters(MediaType.ANIME, { langs: z.array(nameSchema) }),
    listFilters(MediaType.MOVIES, { langs: z.array(nameSchema) }),
    listFilters(MediaType.GAMES, { platforms: z.array(z.object({ name: z.enum(GamesPlatformsEnum) }).strict()) }),
    listFilters(MediaType.BOOKS, { langs: z.array(nameSchema) }),
    listFilters(MediaType.MANGA, {}),
]);

export type TvListArgs = z.infer<typeof tvListArgsSchema>;
export type MovieListArgs = z.infer<typeof movieListArgsSchema>;
export type GameListArgs = z.infer<typeof gameListArgsSchema>;
export type BookListArgs = z.infer<typeof bookListArgsSchema>;
export type MangaListArgs = z.infer<typeof mangaListArgsSchema>;
export type MediaListItem = z.infer<typeof mediaListItemSchema>;
export type MediaListPage = z.infer<typeof mediaListPageSchema>;
export type MediaListFiltersResult = z.infer<typeof mediaListFiltersResultSchema>;
export type ListPagination = z.infer<typeof paginationResultSchema>;
type SeriesListItem = z.infer<typeof seriesListItemSchema>;
export type SeriesListPage = z.infer<typeof seriesListPageSchema>;
export type AnimeListPage = z.infer<typeof animeListPageSchema>;
export type MovieListPage = z.infer<typeof movieListPageSchema>;
export type GameListPage = z.infer<typeof gameListPageSchema>;
export type BookListPage = z.infer<typeof bookListPageSchema>;
export type MangaListPage = z.infer<typeof mangaListPageSchema>;
type TvListItem<K extends TvMediaType> =
    Omit<SeriesListItem, "kind"> & { kind: K };
export type TvListPage<K extends TvMediaType> = {
    kind: K;
    items: TvListItem<K>[];
    pagination: ListPagination;
};

export const validateMediaListPage = <T extends MediaListPage>(value: T): T => {
    if (process.env.NODE_ENV !== "production") mediaListPageSchema.parse(value);
    return value;
};

export const validateMediaListFiltersResult = <T extends MediaListFiltersResult>(value: T): T => {
    if (process.env.NODE_ENV !== "production") mediaListFiltersResultSchema.parse(value);
    return value;
};
