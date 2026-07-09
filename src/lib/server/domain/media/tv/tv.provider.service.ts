import {MediaType} from "@/lib/utils/enums";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {BaseTrendsProviderService} from "@/lib/server/domain/media/base/provider.service";
import {ProviderSearchResults, TmdbTrendingTvResponse, TmdbTvDetails} from "@/lib/types/provider.types";


export class TvProviderService extends BaseTrendsProviderService<TvRepository, TmdbTvDetails, UpsertTvWithDetails> {
    constructor(private client: TmdbApi, repository: TvRepository, private readonly jikanClient: JikanApi) {
        super(repository);
    }

    async search(query: string, page = 1): Promise<ProviderSearchResults> {
        const searchData = await this.client.search(query, page);
        return tmdbTransformer.transformSearchResults(searchData);
    }

    protected _fetchRawDetails(apiId: number) {
        return this.client.getTvDetails(apiId);
    }

    protected _transformDetails(rawData: TmdbTvDetails) {
        if (this.repository.config.mediaType === MediaType.ANIME) {
            return tmdbTransformer.transformAnimeDetailsResults(rawData);
        }
        return tmdbTransformer.transformSeriesDetailsResults(rawData);
    }

    protected async _getMediaIdsForBulkRefresh() {
        const apiIds = await this.client.getTvChangedIds();
        return this.repository.getMediaIdsToBeRefreshed(apiIds);
    }

    protected _fetchRawTrends() {
        return this.client.getTvTrending();
    }

    protected _transformTrends(rawData: TmdbTrendingTvResponse) {
        const tvTrends = tmdbTransformer.transformTvTrends(rawData);
        return tvTrends;
    }

    protected async _enhanceDetails(details: UpsertTvWithDetails, isBulk: boolean) {
        if (this.repository.config.mediaType === MediaType.ANIME) {
            // Automatic refresh metadata, don't update anime genres to not erase better ones from jikan
            // If I add an automatic storing somedays this will means that no genres will ever be added in the first
            // place because this function is called on refresh and on storing.
            // For now because storing is never with isBulk = true, so this works (band-aid!)
            if (isBulk) {
                delete details.genresData;
            }
            else {
                const jikanData = await this.jikanClient.getAnimeGenresAndDemographics(details.mediaData.name);
                details.genresData = tmdbTransformer.addAnimeSpecificGenres(jikanData, details.genresData);
            }
        }

        return details;
    }
}
