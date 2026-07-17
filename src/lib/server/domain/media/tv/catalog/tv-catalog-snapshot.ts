import {CatalogMediaInput} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";


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
