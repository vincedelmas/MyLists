import {HltbApi, IgdbApi} from "@/lib/server/api-providers/api";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {BaseTrendsProviderService} from "@/lib/server/domain/media/base/provider.service";
import {IgdbGameDetails, IgdbTrendGamesResponse, TrendsMedia} from "@/lib/types/provider.types";


export class GamesProviderService extends BaseTrendsProviderService<GamesRepository, IgdbGameDetails, UpsertGameWithDetails> {
    constructor(private client: IgdbApi, repository: GamesRepository, private readonly hltbClient: HltbApi) {
        super(repository);
    }

    async checkHLTBWorks(gameName: string) {
        return this.hltbClient.search(gameName);
    }

    async fetchAndStoreMediaDetailsBulk(apiIds: (number | string)[]) {
        const uniqueApiIds = [...new Set(apiIds.map(Number).filter(Number.isFinite))];
        const mediaIdByApiId = new Map<string, number>();
        if (uniqueApiIds.length === 0) return mediaIdByApiId;

        const existingMedia = await this.repository.findByApiIds(uniqueApiIds);
        for (const media of existingMedia) {
            mediaIdByApiId.set(String(media.apiId), media.id);
        }

        const missingApiIds = uniqueApiIds.filter((apiId) => !mediaIdByApiId.has(String(apiId)));
        const rawDetails = await this._fetchRawDetailsBatch(missingApiIds);

        for (const rawDetail of rawDetails) {
            const details = await this._transformDetails(rawDetail);
            const mediaId = await this.repository.storeMediaWithDetails(details);
            mediaIdByApiId.set(String(details.mediaData.apiId), mediaId);
        }

        return mediaIdByApiId;
    }

    protected _fetchRawDetails(apiId: number) {
        return this.client.getGameDetails(apiId);
    }

    protected _transformDetails(rawData: IgdbGameDetails) {
        return igdbTransformer.transformDetailsResults(rawData);
    }

    protected _getMediaIdsForBulkRefresh(): Promise<(number | string)[]> {
        return this.repository.getMediaIdsToBeRefreshed();
    }

    protected _getBulkRefreshChunkSize() {
        return 500;
    }

    protected _fetchRawDetailsBatch(apiIds: (number | string)[]) {
        return this.client.getGamesDetails(apiIds as number[]);
    }

    protected async _enhanceDetails(details: UpsertGameWithDetails, isBulk: boolean) {
        if (!isBulk) {
            const hltbData = await this.hltbClient.search(details.mediaData.name);
            const extendedMediaData = igdbTransformer.addHLTBDataToMainDetails(hltbData, details.mediaData);
            return { ...details, mediaData: extendedMediaData };
        }

        return details;
    }

    protected _fetchRawTrends() {
        return this.client.getTrendingGames();
    }

    protected _transformTrends(rawData: IgdbTrendGamesResponse[]): Promise<TrendsMedia[]> {
        return Promise.resolve(igdbTransformer.transformGamesTrends(rawData));
    }
}
