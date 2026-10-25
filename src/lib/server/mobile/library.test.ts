import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileLibrary, getMobileLibraryDetail, libraryDetailSchema, continueMobileMedia, continueMobileMediaSchema} from "./library";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    saveContinue: vi.fn(),
    visibility: vi.fn(),
    continue: vi.fn(),
    collections: vi.fn(),
    detail: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
    summaries: vi.fn(),
    results: vi.fn(),
}));
vi.mock("@/lib/server/domain/continue/continue.repository", () => ({ getContinueItems: mocks.continue }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            mediaTracking: { continueUserMedia: mocks.saveContinue },
            profile: { getContinueVisibility: mocks.visibility },
            account: { getUserById: mocks.user },
            collections: { getPaginatedUserCollections: mocks.collections, getCollectionDetails: mocks.detail },
        },
    }),
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({
    dynamicListsRepository: { getAll: mocks.all, get: mocks.get },
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.queries", () => ({
    getDynamicListSummaries: mocks.summaries,
    getDynamicListResults: mocks.results,
}));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ ratingSystem: "score", userMediaSettings: [] });
    mocks.all.mockReturnValue([]);
    mocks.summaries.mockReturnValue(new Map());
    mocks.collections.mockResolvedValue({ items: [], pages: 0 });
});

describe("mobile library access", () => {
    it("scopes both library sources to the verified actor", async () => {
        await getMobileLibrary(10, { page: 1, search: "" });
        expect(mocks.all).toHaveBeenCalledWith(10);
        expect(mocks.collections).toHaveBeenCalledWith(
            10,
            { page: 1, search: "" },
            { kind: "user", id: 10, role: "user" },
        );
    });
    it("only loads dynamic results after the owner-scoped lookup succeeds", async () => {
        mocks.get.mockImplementation(() => {
            throw new Error("Dynamic list not found.");
        });
        await expect(getMobileLibraryDetail(10, { kind: "dynamic", id: 20, page: 1, search: "" })).rejects.toThrow(
            "not found",
        );
        expect(mocks.get).toHaveBeenCalledWith(10, 20);
        expect(mocks.results).not.toHaveBeenCalled();
    });
    it("uses collection authorization instead of directly reading another user's collection", async () => {
        mocks.detail.mockRejectedValue(new Error("Unauthorized"));
        await expect(getMobileLibraryDetail(10, { kind: "collection", id: 20, page: 1, search: "" })).rejects.toThrow(
            "Unauthorized",
        );
        expect(mocks.detail).toHaveBeenCalledWith(20, "read", { kind: "user", id: 10, role: "user" }, { page: 1 });
    });
    it("does not load a hidden Continue list for visitors", async () => {
        mocks.visibility.mockResolvedValue(false);
        const data = await getMobileLibraryDetail(20, { kind: "continue", page: 1, search: "" }, 10);
        expect(data).toMatchObject({ visible: false, items: [] });
        expect(mocks.visibility).toHaveBeenCalledWith(20);
        expect(mocks.continue).not.toHaveBeenCalled();
    });
    it("hides the owner's profile preview while keeping their Continue list accessible", async () => {
        mocks.visibility.mockResolvedValue(false);
        mocks.continue.mockResolvedValue([]);
        const data = await getMobileLibraryDetail(10, { kind: "continue", page: 1, search: "" }, 10);
        expect(data).toMatchObject({ visible: true, showPreview: false });
        expect(mocks.continue).toHaveBeenCalledWith(10, []);
    });
    it("loads a visible Continue list for the subject", async () => {
        mocks.visibility.mockResolvedValue(true);
        mocks.continue.mockResolvedValue([]);
        await getMobileLibraryDetail(20, { kind: "continue", page: 1, search: "" }, 10);
        expect(mocks.continue).toHaveBeenCalledWith(20, []);
    });
    it("lists the visited user's library with the visitor's collection permissions", async () => {
        await getMobileLibrary(20, { page: 1, search: "" }, 10);
        expect(mocks.all).toHaveBeenCalledWith(20);
        expect(mocks.collections).toHaveBeenCalledWith(
            20, { page: 1, search: "" }, { kind: "user", id: 10, role: "user" },
        );
    });
    it("keeps dynamic list ownership scoped to the visited profile and passes the real viewer", async () => {
        const spec = { title: "Favorites" };
        mocks.get.mockReturnValue({ spec });
        mocks.results.mockReturnValue({ page: 1, pages: 0, items: [] });
        await getMobileLibraryDetail(20, { kind: "dynamic", id: 30, page: 1, search: "" }, 10);
        expect(mocks.get).toHaveBeenCalledWith(20, 30);
        expect(mocks.results).toHaveBeenCalledWith(20, spec, { page: 1, viewerId: 10 });
    });
    it("does not impersonate the visited user when opening their private collection", async () => {
        mocks.detail.mockRejectedValue(new Error("Unauthorized"));
        await expect(getMobileLibraryDetail(20, { kind: "collection", id: 30, page: 1, search: "" }, 10))
            .rejects.toThrow("Unauthorized");
        expect(mocks.detail).toHaveBeenCalledWith(30, "read", { kind: "user", id: 10, role: "user" }, { page: 1 });
    });
    it("uses the web continue rules to expose game and book quick actions", async () => {
        mocks.continue.mockResolvedValue([
            { mediaType: "games", mediaId: 1, mediaName: "Game", playtime: 120, imageCover: "cover.jpg" },
            { mediaType: "books", mediaId: 2, mediaName: "Book", actualPage: 95, pages: 100, imageCover: "cover.jpg" },
        ]);
        const data = await getMobileLibraryDetail(10, { kind: "continue", page: 1, search: "" });
        expect(data.items).toMatchObject([
            { progress: { label: "2h 0m played", actionLabel: "+ 60 min", update: { payload: { type: "playtime", playtime: 180 } } } },
            { progress: { label: "95 / 100 pages", actionLabel: "+ 5 pages", update: { payload: { type: "page", actualPage: 100 } } } },
        ]);
    });
    it("scopes a quick update to the viewer and strips a supplied user ID", async () => {
        mocks.saveContinue.mockReturnValue({ item: null, completed: true });
        const input = continueMobileMediaSchema.parse({ mediaType: "books", mediaId: 2, userId: 20 });
        expect(await continueMobileMedia(10, input)).toEqual({ available: false, completed: true });
        expect(mocks.saveContinue).toHaveBeenCalledWith({ userId: 10, mediaType: "books", mediaId: 2 });
        expect(continueMobileMediaSchema.safeParse({ mediaType: "movies", mediaId: 1 }).success).toBe(false);
    });
    it("requires positive IDs for saved lists while allowing continue without an ID", () => {
        expect(libraryDetailSchema.safeParse({ kind: "dynamic" }).success).toBe(false);
        expect(libraryDetailSchema.safeParse({ kind: "collection", id: -1 }).success).toBe(false);
        expect(libraryDetailSchema.safeParse({ kind: "continue" }).success).toBe(true);
    });
});
