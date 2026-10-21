import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileSettings, saveMobileSettings, settingsInputSchema} from "./settings";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    findName: vi.fn(),
    save: vi.fn(),
    lists: vi.fn(),
    del: vi.fn(),
    transaction: vi.fn(),
}));
vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: (run: () => unknown) => {
        mocks.transaction();
        return run();
    },
}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        cacheManager: {del: mocks.del},
        services: {
            account: {getUserById: mocks.user, findUserByName: mocks.findName, updateUserSettings: mocks.save},
            stats: {updateUserMediaListSettings: mocks.lists},
        },
    }),
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({
        name: "owner",
        privacy: "private",
        ratingSystem: "score",
        gridListView: true,
        searchSelector: "books",
        autoMoveCompletedTvToOnHold: true,
        userMediaSettings: ["series", "movies", "anime", "games", "books", "manga"].map((mediaType) => ({
            mediaType,
            active: true,
            releaseNotificationsEnabled: false,
        })),
    });
});

describe("mobile settings", () => {
    it("exposes only editable settings and list notification preferences", async () => {
        const data = await getMobileSettings(10);
        expect(data?.lists).toHaveLength(6);
        expect(data?.lists.find((item) => item.mediaType === "movies")).toMatchObject({
            releaseNotificationsEnabled: false,
            supportsNotifications: true,
        });
        expect(data).not.toHaveProperty("email");
    });

    it("validates identity changes and strips privileged input fields", async () => {
        const data = settingsInputSchema.parse({
            section: "general",
            username: "newname",
            privacy: "public",
            role: "admin",
            userId: 999,
        });
        await saveMobileSettings(10, data);
        expect(mocks.findName).toHaveBeenCalledWith("newname");
        expect(mocks.save).toHaveBeenCalledWith(10, {name: "newname", privacy: "public"});
        expect(settingsInputSchema.safeParse({section: "general", username: "a", privacy: "public"}).success).toBe(
            false,
        );
    });

    it("does not rename-check an unchanged username", async () => {
        await saveMobileSettings(10, {section: "general", username: "owner", privacy: "restricted"});
        expect(mocks.findName).not.toHaveBeenCalled();
    });

    it("saves content preferences together and invalidates the same stats cache as web", async () => {
        const notifications = {movies: true, series: true, books: false, anime: true, games: false, manga: false};
        await saveMobileSettings(10, {
            section: "content",
            anime: true,
            books: true,
            games: false,
            manga: false,
            ratingSystem: "feeling",
            gridListView: true,
            searchSelector: "books",
            autoMoveCompletedTvToOnHold: false,
            releaseNotificationsEnabled: notifications,
        });
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.save).toHaveBeenCalledWith(10, {
            ratingSystem: "feeling",
            gridListView: true,
            searchSelector: "books",
            autoMoveCompletedTvToOnHold: false,
        });
        expect(mocks.lists).toHaveBeenCalledWith(
            10,
            {anime: true, books: true, games: false, manga: false},
            notifications,
        );
        expect(mocks.del).toHaveBeenCalledOnce();
    });
});
