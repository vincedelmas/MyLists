import {serverEnv} from "@/env/server";
import {MediaType} from "@/lib/utils/enums";
import {TmdbAdvancedSearchFilters} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";
import {
    SearchData,
    TMDB_APPENDED_TV_SEASONS,
    TmdbChangesResponse,
    TmdbMovieDetails,
    TmdbMultiSearchResponse,
    TmdbTrendingMoviesResponse,
    TmdbTrendingTvResponse,
    TmdbTvDetails
} from "@/lib/types/provider.types";


type TmdbApiConfig = ApiClientConfig & {
    baseUrl: string;
    tvChangedIdsTtl: number;
    tvChangedIdsCacheKey: string;
};


const createConfig = (): TmdbApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "tmdb-API",
    tvChangedIdsTtl: 5 * 60 * 1000,
    baseUrl: "https://api.themoviedb.org/3",
    tvChangedIdsCacheKey: "tmdb:tvChangedIds",
    throttleOptions: [{
        points: 30,
        duration: 1,
        keyPrefix: "tmdbAPI",
    }],
});


const getApiKey = () => {
    if (!serverEnv.THEMOVIEDB_API_KEY) {
        throw new FormattedError("Movie, series, and anime search is unavailable because TMDB is not configured.");
    }
    return serverEnv.THEMOVIEDB_API_KEY;
};


export const createTmdbApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);
    const resultsPerPage = config.resultsPerPage ?? 20;

    return {
        async search(query: string, page = 1, advancedFilters?: TmdbAdvancedSearchFilters): Promise<SearchData<TmdbMultiSearchResponse>> {
            const apiKey = getApiKey();
            const trimmedQuery = advancedFilters?.title?.trim() ?? query.trim();
            const hasTitleQuery = trimmedQuery.length >= 2;

            const params = new URLSearchParams({ api_key: apiKey, page: page.toString() });

            if (!advancedFilters) {
                params.set("query", query);
                const response = await http.call(`${config.baseUrl}/search/multi?${params.toString()}`);
                return {
                    page,
                    resultsPerPage,
                    rawData: await response.json(),
                };
            }

            const isMovie = advancedFilters.mediaType === MediaType.MOVIES;
            const endpoint = hasTitleQuery
                ? `/search/${isMovie ? "movie" : "tv"}`
                : `/discover/${isMovie ? "movie" : "tv"}`;

            if (hasTitleQuery) params.set("query", trimmedQuery);

            if (advancedFilters.year) {
                params.set(isMovie ? "primary_release_year" : "first_air_date_year", advancedFilters.year.toString());
            }

            if (!hasTitleQuery && advancedFilters.mediaType === MediaType.ANIME) {
                params.set("with_genres", "16");
                params.set("with_original_language", "ja");
            }

            const response = await http.call(`${config.baseUrl}${endpoint}?${params.toString()}`);
            const rawData = await response.json();
            return {
                page,
                resultsPerPage,
                rawData: {
                    ...rawData,
                    results: (rawData.results ?? []).map((item: object) => ({
                        ...item,
                        media_type: isMovie ? "movie" : "tv",
                    })),
                },
            };
        },

        async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
            const apiKey = getApiKey();
            const response = await http.call(`${config.baseUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits`);
            return response.json();
        },

        async getTvDetails(tvId: number): Promise<TmdbTvDetails> {
            const apiKey = getApiKey();

            const appendToRes = ["credits", ...TMDB_APPENDED_TV_SEASONS].join(",");
            const response = await http.call(`${config.baseUrl}/tv/${tvId}?api_key=${apiKey}&append_to_response=${appendToRes}`);

            return response.json();
        },

        async getTvTrending(): Promise<TmdbTrendingTvResponse> {
            const apiKey = getApiKey();
            const response = await http.call(`${config.baseUrl}/trending/tv/week?api_key=${apiKey}`);
            return response.json();
        },

        async getMoviesTrending(): Promise<TmdbTrendingMoviesResponse> {
            const apiKey = getApiKey();
            const response = await http.call(`${config.baseUrl}/trending/movie/week?api_key=${apiKey}`);
            return response.json();
        },

        async getTvChangedIds() {
            const apiKey = getApiKey();
            const cacheStore = await getContainer().then((c) => c.cacheManager);

            return cacheStore.wrap<number[]>(config.tvChangedIdsCacheKey, async () => {
                let page = 1;
                let totalPages = 1;
                const changedApiIds: number[] = [];

                while (page <= Math.min(totalPages, 20)) {
                    try {
                        const response = await http.call(`${config.baseUrl}/tv/changes?api_key=${apiKey}&page=${page}`);
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
            }, { ttl: config.tvChangedIdsTtl });
        },
    };
};


export type TmdbApi = Awaited<ReturnType<typeof createTmdbApi>>;
