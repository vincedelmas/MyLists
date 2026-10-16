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
        await expect(mal.getMangaDetails(2)).rejects.toMatchObject({
            details: { provider: "mal-API", kind: "access", reason: "missingCredentials" },
        });
        expect(httpMocks.call).not.toHaveBeenCalled();
    });
});
