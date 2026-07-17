import {MediaType} from "@/lib/utils/enums";
import {HltbApi, IgdbApi} from "@/lib/server/api-providers/api";
import {CatalogIngestionCommands, GameCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider, MediaDetailsEnricher, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";


const createHltbEnricher = (hltbClient: HltbApi): MediaDetailsEnricher<GameCatalogSnapshot> => {
    return async (details, context) => {
        if (context.isBulk) return details;

        const hltbData = await hltbClient.search(details.name);
        return igdbTransformer.addHLTBDataToMainDetails(hltbData, { ...details });
    }
};


export const createIgdbGamesProvider = (igdb: IgdbApi): ExternalMediaProvider<GameCatalogSnapshot> => {
    return {
        source: "igdb" as const,
        mediaType: MediaType.GAMES,

        search: {
            async search(query: string, page = 1) {
                const raw = await igdb.search(query, page);
                return igdbTransformer.transformSearchResults(raw);
            },
        },

        details: {
            async getDetails(apiId: number) {
                const raw = await igdb.getGameDetails(apiId);
                return igdbTransformer.transformDetailsResults(raw);
            },
            async getDetailsBatch(apiIds) {
                const rawItems = await igdb.getGamesDetails(apiIds.map(Number));
                const entries = await Promise.all(rawItems.map(async raw => [String(raw.id), await igdbTransformer.transformDetailsResults(raw)] as const));
                return new Map(entries);
            },
        },

        trends: {
            async getTrends() {
                const raw = await igdb.getTrendingGames();
                return igdbTransformer.transformGamesTrends(raw);
            },
        },
    };
};


export const createGamesIngestionService = (
    hltbClient: HltbApi,
    catalog: CatalogIngestionCommands<GameCatalogSnapshot>,
    provider: ExternalMediaProvider<GameCatalogSnapshot>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        catalog,
        refreshCandidates,
        refreshPolicy: {
            chunkSize: 500,
        },
        enrichers: [
            createHltbEnricher(hltbClient),
        ],
    });
}
