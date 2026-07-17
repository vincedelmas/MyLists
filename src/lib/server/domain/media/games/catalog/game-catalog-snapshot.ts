import {CatalogMediaInput} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";


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
