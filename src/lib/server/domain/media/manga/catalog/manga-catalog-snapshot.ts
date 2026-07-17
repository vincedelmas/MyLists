import {CatalogMediaInput} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";


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
