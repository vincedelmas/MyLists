import {serverEnv} from "@/env/server";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import {MalAnimeSearchResponse, MalMangaDetails, MalMangaSearchResponse, SearchData} from "@/lib/types/provider.types";


type MalApiConfig = ApiClientConfig & {
    baseUrl: string;
};


const MAL_SEARCH_QUERY_MAX_LENGTH = 64;


const createConfig = (): MalApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "mal-API",
    baseUrl: "https://api.myanimelist.net/v2",
    throttleOptions: [
        {
            points: 1,
            duration: 1,
            keyPrefix: "malAPI-sec",
        },
        {
            points: 30,
            duration: 60,
            keyPrefix: "malAPI-min",
        }
    ],
});


const getRequestOptions = (): RequestInit => {
    if (!serverEnv.MAL_CLIENT_ID) {
        throw new FormattedError(
            "Manga search and MyAnimeList anime genres enrichment are not available: MyAnimeList is not configured.",
            { statusCode: 503 },
        );
    }

    return {
        headers: {
            "X-MAL-CLIENT-ID": serverEnv.MAL_CLIENT_ID,
        },
    };
};


export const createMalApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);
    const resultsPerPage = config.resultsPerPage ?? 20;

    return {
        async searchManga(query: string, page: number = 1): Promise<SearchData<MalMangaSearchResponse>> {
            const checkPage = Math.max(1, Math.floor(page));
            const offset = (checkPage - 1) * resultsPerPage;

            const params = new URLSearchParams({
                q: query,
                offset: offset.toString(),
                limit: resultsPerPage.toString(),
                fields: "id,title,main_picture,alternative_titles,start_date",
            });

            const response = await http.call(`${config.baseUrl}/manga?${params.toString()}`, "get", getRequestOptions());

            return {
                resultsPerPage,
                page: checkPage,
                rawData: await response.json(),
            };
        },

        async getMangaDetails(mangaId: number): Promise<MalMangaDetails> {
            const params = new URLSearchParams({
                fields: [
                    "id",
                    "mean",
                    "title",
                    "status",
                    "genres",
                    "end_date",
                    "synopsis",
                    "popularity",
                    "start_date",
                    "num_volumes",
                    "num_chapters",
                    "main_picture",
                    "serialization",
                    "num_scoring_users",
                    "alternative_titles",
                    "authors{first_name,last_name}",
                ].join(",")
            });

            const response = await http.call(`${config.baseUrl}/manga/${mangaId}?${params.toString()}`, "get", getRequestOptions());
            return response.json();
        },

        async searchAnimeGenres(animeName: string): Promise<MalAnimeSearchResponse> {
            const params = new URLSearchParams({
                limit: "5",
                fields: "id,title,alternative_titles,start_date,genres",
                q: animeName.trim().slice(0, MAL_SEARCH_QUERY_MAX_LENGTH).trimEnd(),
            });

            const response = await http.call(`${config.baseUrl}/anime?${params.toString()}`, "get", getRequestOptions());
            return response.json();
        },
    };
};


export type MalApi = Awaited<ReturnType<typeof createMalApi>>;
