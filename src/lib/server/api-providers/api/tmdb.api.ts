import {serverEnv} from "@/env/server";
import {getContainer} from "@/lib/server/core/container";
import {RateLimiterAbstract} from "rate-limiter-flexible";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {BaseApi} from "@/lib/server/api-providers/api/base.api";
import {
    SearchData,
    TmdbChangesResponse,
    TmdbMovieDetails,
    TmdbMultiSearchResponse,
    TmdbTrendingMoviesResponse,
    TmdbTrendingTvResponse,
    TmdbTvDetails
} from "@/lib/types/provider.types";


export class TmdbApi extends BaseApi {
    private static readonly consumeKey = "tmdb-API";
    private readonly apiKey = serverEnv.THEMOVIEDB_API_KEY;
    private readonly baseUrl = "https://api.themoviedb.org/3";
    private static readonly tvChangedIdsCacheKey = "tmdb:tvChangedIds";
    private static readonly tvChangedIdsTtl = 5 * 60 * 1000; // 5 min in ms
    private static readonly throttleOptions = { points: 30, duration: 1, keyPrefix: "tmdbAPI" };

    constructor(limiter: RateLimiterAbstract, consumeKey: string) {
        super(limiter, consumeKey);
    }

    public static async create() {
        const tmdbLimiter = await createRateLimiter(TmdbApi.throttleOptions);
        return new TmdbApi(tmdbLimiter, TmdbApi.consumeKey);
    }

    async search(query: string, page = 1): Promise<SearchData<TmdbMultiSearchResponse>> {
        const params = new URLSearchParams({
            query: query,
            api_key: this.apiKey,
            page: page.toString(),
        });

        const response = await this.call(`${this.baseUrl}/search/multi?${params.toString()}`);
        return {
            page,
            rawData: await response.json(),
            resultsPerPage: this.resultsPerPage,
        };
    }

    async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
        const response = await this.call(`${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits`);
        return response.json();
    }

    async getTvDetails(tvId: number): Promise<TmdbTvDetails> {
        const response = await this.call(`${this.baseUrl}/tv/${tvId}?api_key=${this.apiKey}&append_to_response=credits`);
        return response.json();
    }

    async getTvTrending(): Promise<TmdbTrendingTvResponse> {
        const response = await this.call(`${this.baseUrl}/trending/tv/week?api_key=${this.apiKey}`);
        return response.json();
    }

    async getMoviesTrending(): Promise<TmdbTrendingMoviesResponse> {
        const response = await this.call(`${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}`);
        return response.json();
    }

    async getTvChangedIds() {
        const cacheStore = await getContainer().then((c) => c.cacheManager);

        return cacheStore.wrap<number[]>(TmdbApi.tvChangedIdsCacheKey, async () => {
            let page = 1;
            let totalPages = 1;
            const changedApiIds: number[] = [];

            while (page <= Math.min(totalPages, 20)) {
                try {
                    const response = await this.call(`${this.baseUrl}/tv/changes?api_key=${this.apiKey}&page=${page}`);
                    const data: TmdbChangesResponse = await response.json();

                    if (data?.results) {
                        changedApiIds.push(...data.results.map((item) => item.id))
                    }

                    totalPages = data.total_pages || 1;
                    page += 1;
                }
                catch (error) {
                    // Failed on 1st page -> Throw so task system log 'failure'. No cache created.
                    if (changedApiIds.length === 0) {
                        throw error;
                    }
                    // Else return what we have so task can process pages 1 to N-1.
                    break;
                }
            }

            return changedApiIds;
        }, { ttl: TmdbApi.tvChangedIdsTtl });
    }
}
