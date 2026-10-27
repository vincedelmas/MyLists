import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileGameSearchOptions} from "./search";
import {Route} from "@/routes/api/mobile/v1/search";

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), user: vi.fn(), options: vi.fn(), wrap: vi.fn() }));
vi.mock("@tanstack/react-router", async original => ({
    ...await original<typeof import("@tanstack/react-router")>(),
    createFileRoute: (path: string) => (options: object) => ({ path, options })
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/request-user", () => ({ getRequestUser: mocks.user }));
vi.mock("@/lib/server/domain/search/catalog-search", () => ({ searchCatalog: mocks.catalog }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        registries: { externalProviders: { get: () => ({ getAdvancedOptions: mocks.options }) } },
        cacheManager: { wrap: mocks.wrap }
    })
}));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 10 });
    mocks.catalog.mockResolvedValue({ data: [], hasNextPage: false });
    mocks.wrap.mockImplementation((_key, load) => load());
    mocks.options.mockResolvedValue({ platforms: [], genres: [] });
});
type Handlers = { GET: (input: { request: Request }) => Promise<Response> };
const get = (query: string) => (Route.options.server!.handlers as unknown as Handlers).GET({ request: new Request(`http://localhost:3000/api/mobile/v1/search?${query}`) });
describe("mobile advanced search", () => {
    it("decodes and validates provider filters before passing the session identity to catalog search", async () => {
        const params = new URLSearchParams({
            query: "",
            page: "1",
            apiProvider: "books",
            advancedFilters: JSON.stringify({ provider: "books", author: "  Author  ", language: "EN" })
        });
        const response = await get(params.toString());
        expect(response.status).toBe(200);
        expect(mocks.catalog).toHaveBeenCalledWith({ query: "", page: 1, apiProvider: "books", advancedFilters: { provider: "books", author: "Author", language: "en" } }, 10);
    });
    it("rejects malformed JSON and invalid filters before calling the provider", async () => {
        expect((await get("query=title&page=1&apiProvider=books&advancedFilters=oops")).status).toBe(400);
        const params = new URLSearchParams({ query: "title", page: "1", apiProvider: "books", advancedFilters: JSON.stringify({ provider: "books", language: "INVALID" }) });
        expect((await get(params.toString())).status).toBe(400);
        expect(mocks.catalog).not.toHaveBeenCalled();
    });
    it("never searches for anonymous callers", async () => {
        mocks.user.mockResolvedValue(null);
        expect((await get("query=title&page=1&apiProvider=tmdb")).status).toBe(401);
        expect(mocks.catalog).not.toHaveBeenCalled();
    });
    it("reuses the web game-options cache", async () => {
        expect(await getMobileGameSearchOptions()).toEqual({ platforms: [], genres: [] });
        expect(mocks.wrap).toHaveBeenCalledWith(expect.any(String), expect.any(Function), { ttl: 86_400_000 });
        expect(mocks.options).toHaveBeenCalledOnce();
    });
});
