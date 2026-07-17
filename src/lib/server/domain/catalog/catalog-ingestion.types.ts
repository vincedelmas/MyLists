type CatalogMediaInput = {
    apiId: number | string;
    name: string;
    releaseDate?: string | null;
    synopsis?: string | null;
    imageCover: string;
    locked?: boolean | null;
};


/**
 * Application boundary used by external providers to resolve and refresh
 * canonical catalog items. This is intentionally a command capability rather
 * than a repository: implementations own transactions and any reconciliation
 * required after provider metadata changes.
 */
export interface CatalogIngestionCommands<TDetails> {
    findByApiId(apiId: number | string): Promise<{ id: number; apiId: number | string } | undefined>;

    findByApiIds(apiIds: (number | string)[]): Promise<{ id: number; apiId: number | string }[]>;

    ingest(details: TDetails): Promise<number>;

    refresh(details: TDetails): Promise<boolean>;
}


export type TvCatalogSnapshot = CatalogMediaInput & {
    originalName?: string | null;
    lastAirDate?: string | null;
    homepage?: string | null;
    createdBy?: string | null;
    durationMinutes: number;
    totalSeasons: number;
    totalEpisodes: number;
    originCountry?: string | null;
    productionStatus?: string | null;
    voteAverage?: number | null;
    voteCount?: number | null;
    popularity?: number | null;
    nextEpisodeNumber?: number | null;
    nextEpisodeSeason?: number | null;
    nextEpisodeAirDate?: string | null;
    actors?: string[];
    networks?: string[];
    genres?: string[] | null;
    seasons?: { seasonNumber: number; episodeCount: number }[];
};


export type MovieCatalogSnapshot = CatalogMediaInput & {
    originalName?: string | null;
    homepage?: string | null;
    durationMinutes: number;
    originalLanguage?: string | null;
    voteAverage?: number | null;
    voteCount?: number | null;
    popularity?: number | null;
    budget?: number | null;
    revenue?: number | null;
    tagline?: string | null;
    collectionExternalId?: number | null;
    directorName?: string | null;
    compositorName?: string | null;
    actors?: string[];
    genres?: string[];
};


export type GameCatalogSnapshot = CatalogMediaInput & {
    gameEngine?: string | null;
    gameModes?: string | null;
    playerPerspective?: string | null;
    voteAverage?: number | null;
    voteCount?: number | null;
    igdbUrl?: string | null;
    hltbMainHours?: number | null;
    hltbMainExtraHours?: number | null;
    hltbCompletionistHours?: number | null;
    steamAppId?: string | null;
    collectionExternalId?: number | null;
    genres?: string[];
    platforms?: string[];
    companies?: { name: string; developer: boolean; publisher: boolean }[];
};


export type BookCatalogSnapshot = CatalogMediaInput & {
    pages: number;
    language?: string | null;
    publisher?: string | null;
    genres?: string[];
    authors?: string[];
};


export type MangaCatalogSnapshot = CatalogMediaInput & {
    originalName?: string | null;
    chapters?: number | null;
    productionStatus?: string | null;
    siteUrl?: string | null;
    endDate?: string | null;
    volumes?: number | null;
    voteAverage?: number | null;
    voteCount?: number | null;
    popularity?: number | null;
    publisher?: string | null;
    genres?: string[];
    authors?: string[];
};
