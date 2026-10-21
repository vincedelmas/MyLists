import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileLibrary, getMobileLibraryDetail, libraryDetailSchema} from "./library";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    collections: vi.fn(),
    detail: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
    summaries: vi.fn(),
    results: vi.fn(),
}));
vi.mock("@/env/client", () => ({clientEnv: {VITE_BASE_URL: "http://localhost:3000"}}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: {getUserById: mocks.user},
            collections: {getPaginatedUserCollections: mocks.collections, getCollectionDetails: mocks.detail},
        },
    }),
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({
    dynamicListsRepository: {getAll: mocks.all, get: mocks.get},
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.queries", () => ({
    getDynamicListSummaries: mocks.summaries,
    getDynamicListResults: mocks.results,
}));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ratingSystem: "score", userMediaSettings: []});
    mocks.all.mockReturnValue([]);
    mocks.summaries.mockReturnValue(new Map());
    mocks.collections.mockResolvedValue({items: [], pages: 0});
});

describe("mobile library access", () => {
    it("scopes both library sources to the verified actor", async () => {
        await getMobileLibrary(10, {page: 1, search: ""});
        expect(mocks.all).toHaveBeenCalledWith(10);
        expect(mocks.collections).toHaveBeenCalledWith(10, {page: 1, search: ""}, {kind: "user", id: 10, role: "user"});
    });
    it("only loads dynamic results after the owner-scoped lookup succeeds", async () => {
        mocks.get.mockImplementation(() => {
            throw new Error("Dynamic list not found.");
        });
        await expect(getMobileLibraryDetail(10, {kind: "dynamic", id: 20, page: 1, search: ""})).rejects.toThrow(
            "not found",
        );
        expect(mocks.get).toHaveBeenCalledWith(10, 20);
        expect(mocks.results).not.toHaveBeenCalled();
    });
    it("uses collection authorization instead of directly reading another user's collection", async () => {
        mocks.detail.mockRejectedValue(new Error("Unauthorized"));
        await expect(getMobileLibraryDetail(10, {kind: "collection", id: 20, page: 1, search: ""})).rejects.toThrow(
            "Unauthorized",
        );
        expect(mocks.detail).toHaveBeenCalledWith(20, "read", {kind: "user", id: 10, role: "user"}, {page: 1});
    });
    it("requires positive IDs for saved lists while allowing continue without an ID", () => {
        expect(libraryDetailSchema.safeParse({kind: "dynamic"}).success).toBe(false);
        expect(libraryDetailSchema.safeParse({kind: "collection", id: -1}).success).toBe(false);
        expect(libraryDetailSchema.safeParse({kind: "continue"}).success).toBe(true);
    });
});
