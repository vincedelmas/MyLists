import {RateLimiterAbstract} from "rate-limiter-flexible";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {BaseApi} from "@/lib/server/api-providers/api/base.api";
import {JikanAnimeSearchResponse, JikanDetails, JikanMangaSearchResponse, SearchData} from "@/lib/types/provider.types";
import {FormattedError} from "@/lib/utils/error-classes";


export class JikanApi extends BaseApi {
    private static readonly consumeKey = "jikan-API";
    private readonly animeUrl = "https://api.jikan.moe/v4/anime";
    private readonly mangaUrl = "https://api.jikan.moe/v4/manga";
    private static readonly perSecThrottle = { points: 1, duration: 1, keyPrefix: "jikanAPI-sec" };
    private static readonly perMinThrottle = { points: 40, duration: 60, keyPrefix: "jikanAPI-min" };

    constructor(limiters: RateLimiterAbstract[], consumeKey: string) {
        super(limiters, consumeKey);
    }

    public static async create() {
        const [perSecondLimiter, perMinuteLimiter] = await Promise.all([
            createRateLimiter(JikanApi.perSecThrottle),
            createRateLimiter(JikanApi.perMinThrottle),
        ]);

        return new JikanApi([perSecondLimiter, perMinuteLimiter], JikanApi.consumeKey);
    }

    async search(query: string, page: number = 1): Promise<SearchData<JikanMangaSearchResponse>> {
        const params = new URLSearchParams({
            q: query,
            page: page.toString(),
        });

        const response = await this.call(`${this.mangaUrl}?${params.toString()}`);
        return {
            page,
            rawData: await response.json(),
            resultsPerPage: this.resultsPerPage,
        };
    }

    async getMangaDetails(mangaId: number): Promise<JikanDetails> {
        const response = await this.call(`${this.mangaUrl}/${mangaId}/full`);
        const data = await response.json();

        if ("status" in data && data.status === 500) {
            throw new FormattedError("Sorry the API is has an internal error (not my fault :D). Please try again later.");
        }

        return data.data;
    }

    async getAnimeGenresAndDemographics(animeName: string): Promise<JikanAnimeSearchResponse> {
        const params = new URLSearchParams({ q: animeName });
        const response = await this.call(`${this.animeUrl}?${params.toString()}`);
        return response.json();
    }
}
