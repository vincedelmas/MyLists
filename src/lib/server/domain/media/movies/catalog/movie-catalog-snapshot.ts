import {CatalogMediaInput} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";


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
