import {beforeEach, describe, expect, it, vi} from "vitest";


const envMocks = vi.hoisted(() => ({
    serverEnv: {
        MAL_CLIENT_ID: "mal-client-id" as string | undefined,
    },
}));


const httpMocks = vi.hoisted(() => ({
    call: vi.fn(),
    createApiHttpClient: vi.fn(),
}));


vi.mock("@/env/server", () => envMocks);
vi.mock("@/lib/server/api-providers/api/http.base", () => ({
    createApiHttpClient: httpMocks.createApiHttpClient,
}));


import {createMalApi} from "@/lib/server/api-providers/api/mal.api";


describe("createMalApi", () => {
    beforeEach(() => {
        envMocks.serverEnv.MAL_CLIENT_ID = "mal-client-id";
        httpMocks.call.mockReset();
        httpMocks.createApiHttpClient.mockReset();
        httpMocks.createApiHttpClient.mockResolvedValue({ call: httpMocks.call });
        httpMocks.call.mockResolvedValue({
            json: vi.fn().mockResolvedValue({ data: [], paging: {} }),
        });
    });

    it("uses shared conservative rate limits and authenticates manga searches", async () => {
        const mal = await createMalApi();
        await mal.searchManga("Berserk", 2);

        expect(httpMocks.createApiHttpClient).toHaveBeenCalledWith(expect.objectContaining({
            consumeKey: "mal-API",
            throttleOptions: [
                expect.objectContaining({ points: 1, duration: 1 }),
                expect.objectContaining({ points: 30, duration: 60 }),
            ],
        }));

        const [requestUrl, method, options] = httpMocks.call.mock.calls[0];
        const url = new URL(requestUrl);
        expect(url.pathname).toBe("/v2/manga");
        expect(url.searchParams.get("q")).toBe("Berserk");
        expect(url.searchParams.get("limit")).toBe("20");
        expect(url.searchParams.get("offset")).toBe("20");
        expect(url.searchParams.get("fields")).toContain("alternative_titles");
        expect(method).toBe("get");
        expect(options).toEqual({
            headers: {
                "X-MAL-CLIENT-ID": "mal-client-id",
            },
        });
    });

    it("requests every manga detail field used by the transformer", async () => {
        const mal = await createMalApi();
        await mal.getMangaDetails(2);

        const url = new URL(httpMocks.call.mock.calls[0][0]);
        const fields = url.searchParams.get("fields") ?? "";
        expect(url.pathname).toBe("/v2/manga/2");
        for (const field of [
            "alternative_titles",
            "start_date",
            "end_date",
            "synopsis",
            "mean",
            "popularity",
            "num_scoring_users",
            "status",
            "genres",
            "num_volumes",
            "num_chapters",
            "authors{first_name,last_name}",
            "serialization",
        ]) {
            expect(fields).toContain(field);
        }
    });

    it("fails lazily with a clear message when MAL is not configured", async () => {
        envMocks.serverEnv.MAL_CLIENT_ID = undefined;
        const mal = await createMalApi();

        await expect(mal.searchManga("Berserk")).rejects.toThrow(
            "MyAnimeList is not configured",
        );
        expect(httpMocks.call).not.toHaveBeenCalled();
    });
});
