import * as z from "zod";
import {GamesPlatformsEnum, MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";


const providerDataSchema = z.strictObject({
    url: z.string(),
    name: z.string(),
});

const namedEntitySchema = z.strictObject({
    name: z.string(),
    id: z.number().int().positive(),
});

const relatedMediaSchema = z.strictObject({
    mediaName: z.string(),
    mediaCover: z.string(),
    mediaId: z.number().int().positive(),
});

const tvSeasonSchema = z.strictObject({
    seasonNumber: z.number().int().positive(),
    episodeCount: z.number().int().nonnegative(),
});

const tvSeasonRewatchSchema = z.strictObject({
    count: z.number().int().nonnegative(),
    seasonNumber: z.number().int().positive(),
});

const commonCatalogShape = {
    id: z.number().int().positive(),
    name: z.string(),
    imageCover: z.string(),
    lockStatus: z.boolean(),
    addedAt: z.string().nullable(),
    synopsis: z.string().nullable(),
    releaseDate: z.string().nullable(),
    lastApiUpdate: z.string().nullable(),
    genres: z.array(namedEntitySchema),
    providerData: providerDataSchema,
};

const tvCatalogDetails = <K extends TvMediaType>(kind: K) => {
    return z.strictObject({
        ...commonCatalogShape,
        apiId: z.number(),
        kind: z.literal(kind),
        homepage: z.string().nullable(),
        createdBy: z.string().nullable(),
        voteCount: z.number().nullable(),
        popularity: z.number().nullable(),
        prodStatus: z.string().nullable(),
        lastAirDate: z.string().nullable(),
        voteAverage: z.number().nullable(),
        originalName: z.string().nullable(),
        originCountry: z.string().nullable(),
        nextEpisodeToAir: z.string().nullable(),
        duration: z.number().int().nonnegative(),
        seasonToAir: z.number().int().nullable(),
        episodeToAir: z.number().int().nullable(),
        totalSeasons: z.number().int().nonnegative(),
        totalEpisodes: z.number().int().nonnegative(),
        seasons: z.array(tvSeasonSchema),
        actors: z.array(namedEntitySchema),
        networks: z.array(namedEntitySchema),
    });
}

const seriesCatalogDetailsSchema = tvCatalogDetails(MediaType.SERIES);

const animeCatalogDetailsSchema = tvCatalogDetails(MediaType.ANIME);

const movieCatalogDetailsSchema = z.strictObject({
    ...commonCatalogShape,
    apiId: z.number(),
    tagline: z.string().nullable(),
    homepage: z.string().nullable(),
    voteCount: z.number().nullable(),
    kind: z.literal(MediaType.MOVIES),
    popularity: z.number().nullable(),
    voteAverage: z.number().nullable(),
    originalName: z.string().nullable(),
    directorName: z.string().nullable(),
    compositorName: z.string().nullable(),
    originalLanguage: z.string().nullable(),
    duration: z.number().int().nonnegative(),
    collectionId: z.number().int().nullable(),
    budget: z.number().nonnegative().nullable(),
    revenue: z.number().nonnegative().nullable(),
    actors: z.array(namedEntitySchema),
    collection: z.array(relatedMediaSchema),
});

const gameCatalogDetailsSchema = z.strictObject({
    ...commonCatalogShape,
    apiId: z.number(),
    igdbUrl: z.string().nullable(),
    kind: z.literal(MediaType.GAMES),
    gameModes: z.string().nullable(),
    voteCount: z.number().nullable(),
    gameEngine: z.string().nullable(),
    steamApiId: z.string().nullable(),
    voteAverage: z.number().nullable(),
    playerPerspective: z.string().nullable(),
    collectionId: z.number().int().nullable(),
    hltbMainTime: z.number().nonnegative().nullable(),
    hltbMainAndExtraTime: z.number().nonnegative().nullable(),
    hltbTotalCompleteTime: z.number().nonnegative().nullable(),
    platforms: z.array(namedEntitySchema),
    collection: z.array(relatedMediaSchema),
    companies: z.array(z.strictObject({
        name: z.string(),
        developer: z.boolean(),
        publisher: z.boolean(),
        id: z.number().int().positive(),
    })),
});

const mangaCatalogDetailsSchema = z.strictObject({
    ...commonCatalogShape,
    apiId: z.number(),
    siteUrl: z.string().nullable(),
    endDate: z.string().nullable(),
    kind: z.literal(MediaType.MANGA),
    voteCount: z.number().nullable(),
    prodStatus: z.string().nullable(),
    popularity: z.number().nullable(),
    publishers: z.string().nullable(),
    voteAverage: z.number().nullable(),
    originalName: z.string().nullable(),
    volumes: z.number().int().nonnegative().nullable(),
    chapters: z.number().int().nonnegative().nullable(),
    authors: z.array(namedEntitySchema),
});

export const bookCatalogDetailsSchema = z.strictObject({
    ...commonCatalogShape,
    apiId: z.string(),
    language: z.string().nullable(),
    kind: z.literal(MediaType.BOOKS),
    publishers: z.string().nullable(),
    pages: z.number().int().nonnegative(),
    authors: z.array(namedEntitySchema),
}).strict();

const commonLibraryEntryShape = {
    favorite: z.boolean(),
    status: z.enum(Status),
    comment: z.string().nullable(),
    addedAt: z.string().nullable(),
    id: z.number().int().positive(),
    lastUpdated: z.string().nullable(),
    customCover: z.string().nullable(),
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    ratingSystem: z.enum(RatingSystemType),
    tags: z.array(z.object({ name: z.string() }).strict()),
    rating: z.number().min(0).max(10).nullable(),
};

const tvLibraryEntry = <K extends TvMediaType>(kind: K) => {
    return z.strictObject({
        ...commonLibraryEntryShape,
        kind: z.literal(kind),
        rewatches: z.array(tvSeasonRewatchSchema),
        currentSeason: z.number().int().positive(),
        currentEpisode: z.number().int().nonnegative(),
        watchedEpisodes: z.number().int().nonnegative(),
    });
}

export const seriesLibraryEntrySchema = tvLibraryEntry(MediaType.SERIES);

export const animeLibraryEntrySchema = tvLibraryEntry(MediaType.ANIME);

export const movieLibraryEntrySchema = z.strictObject({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.MOVIES),
    watchCount: z.number().int().nonnegative(),
    rewatchCount: z.number().int().nonnegative(),
});

export const gameLibraryEntrySchema = z.strictObject({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.GAMES),
    playtime: z.number().nonnegative(),
    platform: z.enum(GamesPlatformsEnum).nullable(),
});

export const bookLibraryEntrySchema = z.strictObject({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.BOOKS),
    rereadCount: z.number().int().nonnegative(),
    totalPagesRead: z.number().int().nonnegative(),
    currentPage: z.number().int().nonnegative().nullable(),
});

export const mangaLibraryEntrySchema = z.strictObject({
    ...commonLibraryEntryShape,
    kind: z.literal(MediaType.MANGA),
    rereadCount: z.number().int().nonnegative(),
    currentChapter: z.number().int().nonnegative(),
    totalChaptersRead: z.number().int().nonnegative(),
});

const followEntry = <K extends MediaType, S extends z.ZodType>(kind: K, userMedia: S) => {
    return z.strictObject({
        userMedia,
        name: z.string(),
        kind: z.literal(kind),
        image: z.string().nullable(),
        id: z.number().int().positive(),
        ratingSystem: z.enum(RatingSystemType),
    });
}

const detailsPage = <K extends MediaType, M extends z.ZodType, U extends z.ZodType>(kind: K, media: M, userMedia: U) => {
    return z.strictObject({
        media,
        kind: z.literal(kind),
        userMedia: userMedia.nullable(),
        similarMedia: z.array(relatedMediaSchema),
        followsData: z.array(followEntry(kind, userMedia)),
    });
}

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
export type TvDetailsPage<K extends TvMediaType> = {
    kind: K;
    media: Omit<SeriesDetailsPage["media"], "kind"> & { kind: K };
    userMedia: (Omit<NonNullable<SeriesDetailsPage["userMedia"]>, "kind"> & { kind: K }) | null;
    followsData: Array<Omit<SeriesDetailsPage["followsData"][number], "kind" | "userMedia"> & {
        kind: K;
        userMedia: Omit<SeriesDetailsPage["followsData"][number]["userMedia"], "kind"> & { kind: K };
    }>;
    similarMedia: SeriesDetailsPage["similarMedia"];
};
