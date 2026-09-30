import {beforeEach, describe, expect, it, vi} from "vitest";


const envMocks = vi.hoisted(() => ({
    serverEnv: { THEMOVIEDB_API_KEY: "tmdb-key" as string | undefined },
}));
const httpMocks = vi.hoisted(() => ({ call: vi.fn() }));


vi.mock("@/env/server", () => envMocks);
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: vi.fn() }));
vi.mock("@/lib/server/api-providers/api/http.base", () => ({
    createApiHttpClient: vi.fn().mockResolvedValue(httpMocks),
}));


import {createTmdbApi} from "./tmdb.api";
import {createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";


describe("TMDB IMDb lookup", () => {
    beforeEach(() => {
        envMocks.serverEnv.THEMOVIEDB_API_KEY = "tmdb-key";
        httpMocks.call.mockReset();
    });

    it.each([
        { movieResults: [{ id: 550 }], ids: [550] },
        { movieResults: [], ids: [] },
        { movieResults: [{ id: 550 }, { id: 680 }], ids: [550, 680] },
    ])("returns only movie IDs from the external ID lookup ($ids)", async ({ movieResults, ids }) => {
        httpMocks.call.mockResolvedValue({
            json: async () => ({
                movie_results: movieResults,
                tv_results: [{ id: 1396 }],
                tv_episode_results: [{ id: 123 }],
                person_results: [{ id: 456 }],
            }),
        });
        const provider = createTmdbMoviesProvider(await createTmdbApi());

        await expect(provider.findMovieIdsByImdbId("tt0137523")).resolves.toEqual(ids);
        expect(httpMocks.call).toHaveBeenCalledTimes(1);
        const url = new URL(httpMocks.call.mock.calls[0][0]);
        expect(url.pathname).toBe("/3/find/tt0137523");
        expect(url.searchParams.get("external_source")).toBe("imdb_id");
        expect(url.searchParams.get("api_key")).toBe("tmdb-key");
    });

    it("reports missing credentials before sending an IMDb lookup request", async () => {
        envMocks.serverEnv.THEMOVIEDB_API_KEY = undefined;
        const api = await createTmdbApi();

        await expect(api.findMovieIdsByImdbId("tt0137523")).rejects.toMatchObject({
            details: { provider: "tmdb-API", kind: "access", reason: "missingCredentials" },
        });
        expect(httpMocks.call).not.toHaveBeenCalled();
    });
});


describe("TMDB filtered search", () => {
    beforeEach(() => {
        envMocks.serverEnv.THEMOVIEDB_API_KEY = "tmdb-key";
        httpMocks.call.mockReset();
    });

    it("keeps combined search when no media type is selected", async () => {
        const rawData = { results: [], total_pages: 1 };
        httpMocks.call.mockResolvedValue({ json: async () => rawData });
        const api = await createTmdbApi();

        const result = await api.search("Dune", 1, { provider: ApiProviderType.TMDB });

        expect(new URL(httpMocks.call.mock.calls[0][0]).pathname).toBe("/3/search/multi");
        expect(result.rawData).toEqual(rawData);
    });

    it.each([
        { mediaType: MediaType.MOVIES, endpoint: "movie", yearParam: "primary_release_year", itemType: MediaType.MOVIES },
        { mediaType: MediaType.SERIES, endpoint: "tv", yearParam: "first_air_date_year", itemType: MediaType.SERIES },
    ])("searches $endpoint by year and preserves result identity and pagination", async ({ mediaType, endpoint, yearParam, itemType }) => {
        httpMocks.call.mockResolvedValue({
            json: async () => ({
                page: 2,
                total_pages: 3,
                total_results: 45,
                results: [{
                    id: 123,
                    title: "Dune",
                    original_title: "Dune",
                    name: "Dune",
                    original_name: "Dune",
                    release_date: "2021-10-22",
                    first_air_date: "2021-10-22",
                    original_language: "en",
                    origin_country: ["US"],
                    genre_ids: [878],
                    poster_path: "/dune.jpg",
                }],
            }),
        });
        const provider = createTmdbSeriesProvider(await createTmdbApi());

        const result = await provider.search("Dune", 2, { provider: ApiProviderType.TMDB, mediaType, releaseYear: 2021 });

        const url = new URL(httpMocks.call.mock.calls[0][0]);
        expect(url.pathname).toBe(`/3/search/${endpoint}`);
        expect(url.searchParams.get(yearParam)).toBe("2021");
        expect(url.searchParams.get("query")).toBe("Dune");
        expect(url.searchParams.get("page")).toBe("2");
        expect(result.hasNextPage).toBe(true);
        expect(result.data).toEqual([{
            id: 123,
            name: "Dune",
            date: "2021-10-22",
            itemType,
            image: "https://image.tmdb.org/t/p/w300/dune.jpg",
        }]);

        await provider.search("Dune", 3, { provider: ApiProviderType.TMDB, mediaType });
        const unfilteredYearUrl = new URL(httpMocks.call.mock.calls[1][0]);
        expect(unfilteredYearUrl.pathname).toBe(`/3/search/${endpoint}`);
        expect(unfilteredYearUrl.searchParams.has(yearParam)).toBe(false);
    });
});
