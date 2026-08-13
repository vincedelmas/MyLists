import {beforeEach, describe, expect, it, vi} from "vitest";


const envMocks = vi.hoisted(() => ({
    serverEnv: {
        IGDB_CLIENT_ID: "igdb-client",
        IGDB_CLIENT_SECRET: "igdb-secret",
    },
}));


const httpMocks = vi.hoisted(() => ({
    call: vi.fn(),
    createApiHttpClient: vi.fn(),
}));


const containerMocks = vi.hoisted(() => ({
    getContainer: vi.fn(),
    cacheGet: vi.fn(),
}));


vi.mock("@/env/server", () => envMocks);
vi.mock("@/lib/server/api-providers/api/http.base", () => ({
    createApiHttpClient: httpMocks.createApiHttpClient,
}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: containerMocks.getContainer,
}));


import {createIgdbApi} from "@/lib/server/api-providers/api/igdb.api";


describe("IGDB trending games", () => {
    beforeEach(() => {
        httpMocks.call.mockReset();
        httpMocks.createApiHttpClient.mockReset();
        httpMocks.createApiHttpClient.mockResolvedValue({ call: httpMocks.call });
        containerMocks.cacheGet.mockReset();
        containerMocks.cacheGet.mockResolvedValue("cached-igdb-token");
        containerMocks.getContainer.mockReset();
        containerMocks.getContainer.mockResolvedValue({
            cacheManager: { get: containerMocks.cacheGet },
        });
    });

    it("ranks recent games from every popularity candidate batch", async () => {
        const nowMs = Date.UTC(2026, 7, 13, 12);
        vi.spyOn(Date, "now").mockReturnValue(nowMs);
        const visitCandidates = Array.from({ length: 501 }, (_, index) => ({
            game_id: index + 1,
            popularity_type: 1,
            value: 501 - index,
        }));

        httpMocks.call
            .mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue([
                    { result: visitCandidates },
                    { result: [] },
                    { result: [] },
                    { result: [] },
                ]),
            })
            .mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue([
                    { result: [{ id: 1, name: "Approximate Leader", first_release_date: 1783900800 }] },
                    { result: [{ id: 501, name: "Second Batch", first_release_date: 1783987200 }] },
                ]),
            });

        const api = await createIgdbApi();
        const games = await api.getTrendingGames();

        expect(games.map((game) => game.id)).toEqual([1, 501]);
        expect(httpMocks.call).toHaveBeenCalledTimes(2);

        const [multiQueryUrl, multiQueryMethod, multiQueryOptions] = httpMocks.call.mock.calls[0];
        expect(multiQueryUrl).toBe("https://api.igdb.com/v4/multiquery");
        expect(multiQueryMethod).toBe("post");
        for (const popularityType of [1, 2, 3, 4]) {
            expect(multiQueryOptions.body).toContain(`where popularity_type = ${popularityType};`);
        }

        const [gamesUrl, gamesMethod, gamesOptions] = httpMocks.call.mock.calls[1];
        const releasedAfter = Math.floor(nowMs / 1000) - 90 * 24 * 60 * 60;
        expect(gamesUrl).toBe("https://api.igdb.com/v4/multiquery");
        expect(gamesMethod).toBe("post");
        expect(gamesOptions.body).toContain('query games "candidates-0"');
        expect(gamesOptions.body).toContain('query games "candidates-1"');
        expect(gamesOptions.body).toContain(`first_release_date >= ${releasedAfter}`);
        expect(gamesOptions.body).toContain("game_type = (0,8)");
        expect(gamesOptions.body).toContain("cover != null");
        expect(gamesOptions.body).toContain("videos != null");

    });
});
