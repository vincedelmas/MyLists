import {beforeEach, describe, expect, it, vi} from "vitest";
import {searchCatalog} from "./catalog-search";

const mocks = vi.hoisted(() => ({
    search: vi.fn(),
    users: vi.fn(),
    localBooks: vi.fn(),
    stored: vi.fn(),
    membership: vi.fn(),
}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {profile: {searchUsers: mocks.users}},
        registries: {
            externalProviders: {get: () => ({search: mocks.search})},
            mediaService: {
                get: () => ({
                    searchByName: mocks.localBooks,
                    findByApiIds: mocks.stored,
                    findUserMediaIds: mocks.membership,
                }),
            },
        },
    }),
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.search.mockResolvedValue({hasNextPage: false, data: [{id: "external", itemType: "movies", name: "Film"}]});
    mocks.stored.mockResolvedValue([{id: 7, apiId: "external"}]);
    mocks.membership.mockResolvedValue([7]);
    mocks.localBooks.mockResolvedValue([]);
});

describe("shared catalog search", () => {
    it("retains the web's anonymous-user search and media sign-in boundary", async () => {
        mocks.users.mockResolvedValue({hasNextPage: false, data: []});
        await searchCatalog({query: "owner", page: 1, apiProvider: "users"});
        expect(mocks.users).toHaveBeenCalledWith("owner", 1, undefined);
        await expect(searchCatalog({query: "Film", page: 1, apiProvider: "tmdb"})).rejects.toThrow("Log-in");
        expect(mocks.search).not.toHaveBeenCalled();
    });

    it("decorates provider results with the caller's list membership", async () => {
        const result = await searchCatalog({query: "Film", page: 1, apiProvider: "tmdb"}, 10);
        expect(result.data[0]).toMatchObject({mediaId: 7, inCurrentUserList: true});
        expect(mocks.membership).toHaveBeenCalledWith(10, [7]);
    });

    it("preserves locally stored book results and removes duplicate external hits", async () => {
        mocks.localBooks.mockResolvedValue([{id: "local", itemType: "books", name: "Local book"}]);
        mocks.search.mockResolvedValue({
            hasNextPage: true,
            data: [
                {id: "local", itemType: "books", name: "Duplicate"},
                {id: "new", itemType: "books", name: "New book"},
            ],
        });
        const result = await searchCatalog({query: "Book", page: 1, apiProvider: "books"}, 10);
        expect(result.data.map((item) => item.name)).toEqual(["Local book", "New book"]);
        expect(result.hasNextPage).toBe(true);
    });
});
