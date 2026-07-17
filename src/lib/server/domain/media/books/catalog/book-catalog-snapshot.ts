import {CatalogMediaInput} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";


export type BookCatalogSnapshot = CatalogMediaInput & {
    pages: number;
    language?: string | null;
    publisher?: string | null;
    genres?: string[];
    authors?: string[];
};
