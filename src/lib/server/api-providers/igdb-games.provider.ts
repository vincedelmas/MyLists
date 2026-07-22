import {HltbApi, IgdbApi} from "@/lib/server/api-providers/api";
import {GamesRepository} from "@/lib/server/domain/media/games";
import {gamesDefinition} from "@/lib/server/domain/media/games/games.definition";
import {UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider, MediaDetailsEnricher} from "@/lib/server/api-providers/interfaces.types";


const createHltbEnricher = (hltbClient: HltbApi): MediaDetailsEnricher<UpsertGameWithDetails> => {
    return async (details, context) => {
        if (context.isBulk) return details;

        const hltbData = await hltbClient.search(details.mediaData.name);

        return {
            ...details,
            mediaData: igdbTransformer.addHLTBDataToMainDetails(hltbData, details.mediaData),
        };
    }
};


export const createIgdbGamesProvider = (igdb: IgdbApi): ExternalMediaProvider<UpsertGameWithDetails> => {
    const transformOptions = {
        ...gamesDefinition.identity,
        maxGenres: gamesDefinition.ingestion.limits.genres,
    };

    return {
        source: "igdb" as const,
        mediaType: gamesDefinition.identity.mediaType,

        search: {
            async search(query: string, page = 1) {
                const raw = await igdb.search(query, page);
                return igdbTransformer.transformSearchResults(raw, transformOptions);
            },
        },

        details: {
            async getDetails(apiId: number) {
                const raw = await igdb.getGameDetails(apiId);
                return igdbTransformer.transformDetailsResults(raw, transformOptions);
            },
            async getDetailsBatch(apiIds) {
                const rawItems = await igdb.getGamesDetails(apiIds.map(Number));
                const entries = await Promise.all(rawItems.map(async raw => [String(raw.id), await igdbTransformer.transformDetailsResults(raw, transformOptions)] as const));
                return new Map(entries);
            },
        },

        trends: {
            async getTrends() {
                const raw = await igdb.getTrendingGames();
                return igdbTransformer.transformGamesTrends(raw, transformOptions);
            },
        },
    };
};


export const createGamesIngestionService = (hltbClient: HltbApi, repository: GamesRepository, provider: ExternalMediaProvider<UpsertGameWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository: repository,
        refreshCandidates: {
            getCandidateApiIds: () => {
                return repository.getMediaIdsToBeRefreshed();
            },
        },
        refreshPolicy: {
            chunkSize: gamesDefinition.ingestion.refresh.chunkSize,
        },
        enrichers: [
            createHltbEnricher(hltbClient),
        ],
    });
}
