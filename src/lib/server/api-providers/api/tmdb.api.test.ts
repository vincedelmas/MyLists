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

import {createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";


describe("TMDB IMDb lookup", () => {
    beforeEach(() => {
        envMocks.serverEnv.THEMOVIEDB_API_KEY = "tmdb-key";
        httpMocks.call.mockReset();
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
                    ...(mediaType === MediaType.MOVIES ? {
                        title: "Dune",
                        original_title: "Dune",
                        release_date: "2021-10-22",
                    } : {
                        name: "Dune",
                        original_name: "Dune",
                        first_air_date: "2021-10-22",
                        origin_country: ["US"],
                    }),
                    original_language: "en",
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

        const lastPage = await provider.search("Dune", 3, { provider: ApiProviderType.TMDB, mediaType });
        const unfilteredYearUrl = new URL(httpMocks.call.mock.calls[1][0]);
        expect(unfilteredYearUrl.pathname).toBe(`/3/search/${endpoint}`);
        expect(unfilteredYearUrl.searchParams.has(yearParam)).toBe(false);
        expect(lastPage.hasNextPage).toBe(false);
    });
});
