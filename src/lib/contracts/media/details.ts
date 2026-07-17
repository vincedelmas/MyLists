import * as z from "zod";
import {GamesPlatformsEnum, MediaType, RatingSystemType, Status} from "@/lib/utils/enums";


const namedEntitySchema = z.object({ id: z.number().int().positive(), name: z.string() }).strict();
const providerDataSchema = z.object({ name: z.string(), url: z.string() }).strict();
const relatedMediaSchema = z.object({
    mediaId: z.number().int().positive(),
    mediaName: z.string(),
    mediaCover: z.string(),
}).strict();
const tvSeasonSchema = z.object({
    seasonNumber: z.number().int().positive(),
    episodeCount: z.number().int().nonnegative(),
}).strict();
const tvSeasonRewatchSchema = z.object({
    seasonNumber: z.number().int().positive(),
    count: z.number().int().nonnegative(),
}).strict();

const commonCatalogShape = {
    id: z.number().int().positive(),
    name: z.string(),
    releaseDate: z.string().nullable(),
    synopsis: z.string().nullable(),
    imageCover: z.string(),
    lockStatus: z.boolean(),
    addedAt: z.string().nullable(),
    lastApiUpdate: z.string().nullable(),
    genres: z.array(namedEntitySchema),
    providerData: providerDataSchema,
};

const tvCatalogDetails = <K extends typeof MediaType.SERIES | typeof MediaType.ANIME>(kind: K) => z.object({
    ...commonCatalogShape,
    kind: z.literal(kind),
    apiId: z.number(),
    homepage: z.string().nullable(),
    createdBy: z.string().nullable(),
    voteCount: z.number().nullable(),
    popularity: z.number().nullable(),
    lastAirDate: z.string().nullable(),
    voteAverage: z.number().nullable(),
    originalName: z.string().nullable(),
    totalSeasons: z.number().int().nonnegative(),
    totalEpisodes: z.number().int().nonnegative(),
    originCountry: z.string().nullable(),
    prodStatus: z.string().nullable(),
    seasonToAir: z.number().int().nullable(),
    episodeToAir: z.number().int().nullable(),
    duration: z.number().int().nonnegative(),
    nextEpisodeToAir: z.string().nullable(),
    actors: z.array(namedEntitySchema),
    networks: z.array(namedEntitySchema),
    seasons: z.array(tvSeasonSchema),
}).strict();

const seriesCatalogDetailsSchema = tvCatalogDetails(MediaType.SERIES);
const animeCatalogDetailsSchema = tvCatalogDetails(MediaType.ANIME);
const movieCatalogDetailsSchema = z.object({
    ...commonCatalogShape,
    kind: z.literal(MediaType.MOVIES),
    apiId: z.number(),
    originalName: z.string().nullable(),
    homepage: z.string().nullable(),
    duration: z.number().int().nonnegative(),
    originalLanguage: z.string().nullable(),
    voteAverage: z.number().nullable(),
    voteCount: z.number().nullable(),
    popularity: z.number().nullable(),
    budget: z.number().nonnegative().nullable(),
    revenue: z.number().nonnegative().nullable(),
    tagline: z.string().nullable(),
    collectionId: z.number().int().nullable(),
    directorName: z.string().nullable(),
    compositorName: z.string().nullable(),
    actors: z.array(namedEntitySchema),
    collection: z.array(relatedMediaSchema),
}).strict();
const gameCatalogDetailsSchema = z.object({
    ...commonCatalogShape,
    kind: z.literal(MediaType.GAMES),
    apiId: z.number(),
    gameEngine: z.string().nullable(),
    gameModes: z.string().nullable(),
    playerPerspective: z.string().nullable(),
    voteAverage: z.number().nullable(),
    voteCount: z.number().nullable(),
    igdbUrl: z.string().nullable(),
    hltbMainTime: z.number().nonnegative().nullable(),
    hltbMainAndExtraTime: z.number().nonnegative().nullable(),
    hltbTotalCompleteTime: z.number().nonnegative().nullable(),
    steamApiId: z.string().nullable(),
    collectionId: z.number().int().nullable(),
    platforms: z.array(namedEntitySchema),
    companies: z.array(z.object({
        id: z.number().int().positive(),
        name: z.string(),
        developer: z.boolean(),
        publisher: z.boolean(),
    }).strict()),
    collection: z.array(relatedMediaSchema),
}).strict();
export const bookCatalogDetailsSchema = z.object({
    ...commonCatalogShape,
    kind: z.literal(MediaType.BOOKS),
    apiId: z.string(),
    pages: z.number().int().nonnegative(),
    language: z.string().nullable(),
    publishers: z.string().nullable(),
    authors: z.array(namedEntitySchema),
}).strict();
const mangaCatalogDetailsSchema = z.object({
    ...commonCatalogShape,
    kind: z.literal(MediaType.MANGA),
    apiId: z.number(),
    originalName: z.string().nullable(),
    chapters: z.number().int().nonnegative().nullable(),
    prodStatus: z.string().nullable(),
    siteUrl: z.string().nullable(),
    endDate: z.string().nullable(),
    volumes: z.number().int().nonnegative().nullable(),
    voteAverage: z.number().nullable(),
    voteCount: z.number().nullable(),
    popularity: z.number().nullable(),
    publishers: z.string().nullable(),
    authors: z.array(namedEntitySchema),
}).strict();

const commonLibraryEntryShape = {
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
    ratingSystem: z.enum(RatingSystemType),
    tags: z.array(z.object({ name: z.string() }).strict()),
};

const tvLibraryEntry = <K extends typeof MediaType.SERIES | typeof MediaType.ANIME>(kind: K) => z.object({
    ...commonLibraryEntryShape,
    kind: z.literal(kind),
    currentSeason: z.number().int().positive(),
    currentEpisode: z.number().int().nonnegative(),
    watchedEpisodes: z.number().int().nonnegative(),
    rewatches: z.array(tvSeasonRewatchSchema),
}).strict();

export const seriesLibraryEntrySchema = tvLibraryEntry(MediaType.SERIES);
export const animeLibraryEntrySchema = tvLibraryEntry(MediaType.ANIME);
export const movieLibraryEntrySchema = z.object({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.MOVIES),
    rewatchCount: z.number().int().nonnegative(),
    watchCount: z.number().int().nonnegative(),
}).strict();
export const gameLibraryEntrySchema = z.object({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.GAMES),
    playtime: z.number().nonnegative(),
    platform: z.enum(GamesPlatformsEnum).nullable(),
}).strict();
export const bookLibraryEntrySchema = z.object({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.BOOKS),
    currentPage: z.number().int().nonnegative().nullable(),
    rereadCount: z.number().int().nonnegative(),
    totalPagesRead: z.number().int().nonnegative(),
}).strict();
export const mangaLibraryEntrySchema = z.object({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.MANGA),
    currentChapter: z.number().int().nonnegative(),
    rereadCount: z.number().int().nonnegative(),
    totalChaptersRead: z.number().int().nonnegative(),
}).strict();

const followEntry = <K extends MediaType, S extends z.ZodType>(kind: K, userMedia: S) => z.object({
    kind: z.literal(kind),
    id: z.number().int().positive(),
    name: z.string(),
    image: z.string().nullable(),
    ratingSystem: z.enum(RatingSystemType),
    userMedia,
}).strict();

const detailsPage = <K extends MediaType, M extends z.ZodType, U extends z.ZodType>(kind: K, media: M, userMedia: U) => z.object({
    kind: z.literal(kind),
    media,
    userMedia: userMedia.nullable(),
    followsData: z.array(followEntry(kind, userMedia)),
    similarMedia: z.array(relatedMediaSchema),
}).strict();

const seriesDetailsPageSchema = detailsPage(MediaType.SERIES, seriesCatalogDetailsSchema, seriesLibraryEntrySchema);
const animeDetailsPageSchema = detailsPage(MediaType.ANIME, animeCatalogDetailsSchema, animeLibraryEntrySchema);
const movieDetailsPageSchema = detailsPage(MediaType.MOVIES, movieCatalogDetailsSchema, movieLibraryEntrySchema);
const gameDetailsPageSchema = detailsPage(MediaType.GAMES, gameCatalogDetailsSchema, gameLibraryEntrySchema);
const bookDetailsPageSchema = detailsPage(MediaType.BOOKS, bookCatalogDetailsSchema, bookLibraryEntrySchema);
const mangaDetailsPageSchema = detailsPage(MediaType.MANGA, mangaCatalogDetailsSchema, mangaLibraryEntrySchema);

export const mediaDetailsPageSchema = z.discriminatedUnion("kind", [
    seriesDetailsPageSchema,
    animeDetailsPageSchema,
    movieDetailsPageSchema,
    gameDetailsPageSchema,
    bookDetailsPageSchema,
    mangaDetailsPageSchema,
]);

export type MediaDetailsPage = z.infer<typeof mediaDetailsPageSchema>;
export type SeriesDetailsPage = z.infer<typeof seriesDetailsPageSchema>;
export type AnimeDetailsPage = z.infer<typeof animeDetailsPageSchema>;
export type MovieDetailsPage = z.infer<typeof movieDetailsPageSchema>;
export type GameDetailsPage = z.infer<typeof gameDetailsPageSchema>;
export type BookDetailsPage = z.infer<typeof bookDetailsPageSchema>;
export type MangaDetailsPage = z.infer<typeof mangaDetailsPageSchema>;
export type TvDetailsPage<K extends typeof MediaType.SERIES | typeof MediaType.ANIME> = {
    kind: K;
    media: Omit<SeriesDetailsPage["media"], "kind"> & { kind: K };
    userMedia: (Omit<NonNullable<SeriesDetailsPage["userMedia"]>, "kind"> & { kind: K }) | null;
    followsData: Array<Omit<SeriesDetailsPage["followsData"][number], "kind" | "userMedia"> & {
        kind: K;
        userMedia: Omit<SeriesDetailsPage["followsData"][number]["userMedia"], "kind"> & { kind: K };
    }>;
    similarMedia: SeriesDetailsPage["similarMedia"];
};

export const validateMediaDetailsPage = <T extends MediaDetailsPage>(value: T): T => {
    if (process.env.NODE_ENV !== "production") mediaDetailsPageSchema.parse(value);
    return value;
};
