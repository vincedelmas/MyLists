type CatalogMediaInput = {
    id?: number;
    apiId: number | string;
    name: string;
    releaseDate?: string | null;
    synopsis?: string | null;
    imageCover: string;
    lockStatus?: boolean | null;
    addedAt?: string | null;
    lastApiUpdate?: string | null;
};


export type UpsertTvWithDetails = {
    mediaData: CatalogMediaInput & {
        originalName?: string | null;
        lastAirDate?: string | null;
        homepage?: string | null;
        createdBy?: string | null;
        duration: number;
        totalSeasons: number;
        totalEpisodes: number;
        originCountry?: string | null;
        prodStatus?: string | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        popularity?: number | null;
        episodeToAir?: number | null;
        seasonToAir?: number | null;
        nextEpisodeToAir?: string | null;
    };
    actorsData?: { name: string }[];
    networkData?: { name: string }[];
    genresData?: { name: string }[] | null;
    seasonsData?: { season: number; episodes: number }[];
};


export type UpsertMovieWithDetails = {
    mediaData: CatalogMediaInput & {
        originalName?: string | null;
        homepage?: string | null;
        duration: number;
        originalLanguage?: string | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        popularity?: number | null;
        budget?: number | null;
        revenue?: number | null;
        tagline?: string | null;
        collectionId?: number | null;
        directorName?: string | null;
        compositorName?: string | null;
    };
    actorsData?: { name: string }[];
    genresData?: { name: string }[];
};


export type UpsertGameWithDetails = {
    mediaData: CatalogMediaInput & {
        gameEngine?: string | null;
        gameModes?: string | null;
        playerPerspective?: string | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        igdbUrl?: string | null;
        hltbMainTime?: number | null;
        hltbMainAndExtraTime?: number | null;
        hltbTotalCompleteTime?: number | null;
        steamApiId?: string | null;
        collectionId?: number | null;
    };
    genresData?: { name: string }[];
    platformsData?: { name: string }[];
    companiesData?: { name: string; developer: boolean; publisher: boolean }[];
};


export type UpsertBooksWithDetails = {
    mediaData: CatalogMediaInput & {
        pages: number;
        language?: string | null;
        publishers?: string | null;
    };
    genresData?: { name: string }[];
    authorsData?: { name: string }[];
};


export type UpsertMangaWithDetails = {
    mediaData: CatalogMediaInput & {
        originalName?: string | null;
        chapters?: number | null;
        prodStatus?: string | null;
        siteUrl?: string | null;
        endDate?: string | null;
        volumes?: number | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        popularity?: number | null;
        publishers?: string | null;
    };
    genresData?: { name: string }[];
    authorsData?: { name: string }[];
};
