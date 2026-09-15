import {beforeEach, describe, expect, it, vi} from "vitest";


const envMocks = vi.hoisted(() => ({
    serverEnv: { THEMOVIEDB_API_KEY: "tmdb-key" as string | undefined },
}));
const httpMocks = vi.hoisted(() => ({ call: vi.fn() }));


vi.mock("@/env/server", () => envMocks);
vi.mock("@/lib/server/core/container", () => ({ getContainer: vi.fn() }));
vi.mock("@/lib/server/api-providers/api/http.base", () => ({
    createApiHttpClient: vi.fn().mockResolvedValue(httpMocks),
}));


import {createTmdbApi} from "./tmdb.api";
import {createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";


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
