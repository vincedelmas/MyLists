import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType} from "@/lib/utils/enums";


const envMocks = vi.hoisted(() => ({
    serverEnv: {
        GOOGLE_BOOKS_API_KEY: "books-key",
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


import {createGBooksApi} from "@/lib/server/api-providers/api/gbooks.api";
import {createIgdbApi} from "@/lib/server/api-providers/api/igdb.api";


describe("advanced provider searches", () => {
    beforeEach(() => {
        httpMocks.call.mockReset();
        httpMocks.createApiHttpClient.mockReset();
        httpMocks.createApiHttpClient.mockResolvedValue({ call: httpMocks.call });
        httpMocks.call.mockResolvedValue({
            json: vi.fn().mockResolvedValue({ results: [], total_pages: 1, total_results: 0 }),
        });
        containerMocks.cacheGet.mockReset();
        containerMocks.cacheGet.mockResolvedValue("cached-igdb-token");
        containerMocks.getContainer.mockReset();
        containerMocks.getContainer.mockResolvedValue({
            cacheManager: { get: containerMocks.cacheGet },
        });
    });

    it("builds one fielded Google Books request from the submitted form", async () => {
        const api = await createGBooksApi();
        await api.search("The Dispossessed", 2, {
            provider: ApiProviderType.BOOKS,
            author: "Ursula K. Le Guin",
            isbn: "978-0-06-105488-4",
            language: "en",
            printType: "books",
            availability: "ebooks",
            orderBy: "newest",
        });

        expect(httpMocks.call).toHaveBeenCalledTimes(1);
        const url = new URL(httpMocks.call.mock.calls[0][0]);
        expect(url.searchParams.get("q")).toBe(
            "intitle:\"The Dispossessed\" inauthor:\"Ursula K. Le Guin\" isbn:9780061054884",
        );
        expect(url.searchParams.get("startIndex")).toBe("20");
        expect(url.searchParams.get("langRestrict")).toBe("en");
        expect(url.searchParams.get("printType")).toBe("books");
        expect(url.searchParams.get("filter")).toBe("ebooks");
        expect(url.searchParams.get("orderBy")).toBe("newest");
    });

    it("uses IGDB array-membership filters for platform and genre", async () => {
        httpMocks.call.mockResolvedValue({ json: vi.fn().mockResolvedValue([]) });
        const api = await createIgdbApi();
        await api.search("Final Fantasy", 1, {
            provider: ApiProviderType.IGDB,
            platformId: 167,
            genreId: 12,
            releaseYearFrom: 2020,
            releaseYearTo: 2025,
            minimumRating: 75,
        });

        expect(httpMocks.call).toHaveBeenCalledTimes(1);
        const [, method, options] = httpMocks.call.mock.calls[0];
        expect(method).toBe("post");
        expect(options.body).toContain('search "Final Fantasy";');
        expect(options.body).toContain("version_parent = null");
        expect(options.body).toContain("platforms = (167)");
        expect(options.body).toContain("genres = (12)");
        expect(options.body).toContain("first_release_date >= 1577836800");
        expect(options.body).toContain("first_release_date < 1767225600");
        expect(options.body).toContain("total_rating >= 75");
    });

    it("loads the complete IGDB platform and genre catalogs for advanced search", async () => {
        let platformPage = 0;
        httpMocks.call.mockImplementation((url: string) => {
            const values = url.endsWith("/genres")
                ? [{ id: 12, name: "Role-playing (RPG)" }]
                : platformPage++ === 0
                    ? Array.from({ length: 500 }, (_, index) => ({ id: index + 1, name: `Platform ${index + 1}` }))
                    : [{ id: 501, name: "Switch 2" }];

            return Promise.resolve({ json: vi.fn().mockResolvedValue(values) });
        });

        const api = await createIgdbApi();
        const options = await api.getAdvancedSearchOptions();

        expect(options.genres).toEqual([{ id: 12, name: "Role-playing (RPG)" }]);
        expect(options.platforms).toHaveLength(501);
        expect(options.platforms.at(-1)).toEqual({ id: 501, name: "Switch 2" });

        const platformBodies = httpMocks.call.mock.calls
            .filter(([url]) => String(url).endsWith("/platforms"))
            .map(([, , request]) => request.body);
        expect(platformBodies).toEqual([
            "fields id, name; sort name asc; limit 500; offset 0;",
            "fields id, name; sort name asc; limit 500; offset 500;",
        ]);
    });

});
