import {FormattedError} from "@/lib/utils/error-classes";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import {JikanAnimeSearchResponse, JikanDetails, JikanMangaSearchResponse, SearchData} from "@/lib/types/provider.types";


type JikanApiConfig = ApiClientConfig & {
    animeUrl: string;
    mangaUrl: string;
};


const createConfig = (): JikanApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "jikan-API",
    animeUrl: "https://api.jikan.moe/v4/anime",
    mangaUrl: "https://api.jikan.moe/v4/manga",
    throttleOptions: [
        {
            points: 1,
            duration: 1,
            keyPrefix: "jikanAPI-sec",
        },
        {
            points: 40,
            duration: 60,
            keyPrefix: "jikanAPI-min",
        }
    ],
});


export const createJikanApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);
    const resultsPerPage = config.resultsPerPage ?? 20;

    return {
        async search(query: string, page: number = 1): Promise<SearchData<JikanMangaSearchResponse>> {
            const params = new URLSearchParams({ q: query, page: page.toString() });
            const response = await http.call(`${config.mangaUrl}?${params.toString()}`);
            return {
                page,
                resultsPerPage,
                rawData: await response.json(),
            };
        },

        async getMangaDetails(mangaId: number): Promise<JikanDetails> {
            const response = await http.call(`${config.mangaUrl}/${mangaId}/full`);
            const data = await response.json();

            if ("status" in data && data.status >= 500) {
                throw new FormattedError("API currently not accessible. Please try again later.", { statusCode: data.status });
            }

            return data.data;
        },

        async getAnimeGenresAndDemographics(animeName: string): Promise<JikanAnimeSearchResponse> {
            const params = new URLSearchParams({ q: animeName });
            const response = await http.call(`${config.animeUrl}?${params.toString()}`);
            return response.json();
        },
    };
};


export type JikanApi = Awaited<ReturnType<typeof createJikanApi>>;
