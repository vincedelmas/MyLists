import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileSettings, saveMobileSettings, settingsInputSchema, getMobileProfileSettings} from "./settings";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    upload: vi.fn(),
    getHighlights: vi.fn(),
    saveProfile: vi.fn(),
    getVisibility: vi.fn(),
    getPins: vi.fn(),
    setPin: vi.fn(),
    findName: vi.fn(),
    save: vi.fn(),
    lists: vi.fn(),
    del: vi.fn(),
    transaction: vi.fn(),
}));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveUploadedImage: mocks.upload }));
vi.mock("@/lib/server/domain/profile/profile-pins.repository", () => ({ profilePinsRepository: { getOwn: mocks.getPins, set: mocks.setPin } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: (run: () => unknown) => {
        mocks.transaction();
        return run();
    },
}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        cacheManager: { del: mocks.del },
        services: {
            account: { getUserById: mocks.user, findUserByName: mocks.findName, updateUserSettings: mocks.save },
            profile: { getHighlightedMediaSettings: mocks.getHighlights, saveProfileCustomSettings: mocks.saveProfile, getContinueVisibility: mocks.getVisibility },
            stats: { updateUserMediaListSettings: mocks.lists },
        },
    }),
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({
        name: "owner",
        image: "/avatar.jpg",
        backgroundImage: "/background.jpg",
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
        expect(mocks.save).toHaveBeenCalledWith(10, { name: "newname", privacy: "public" });
        expect(settingsInputSchema.safeParse({ section: "general", username: "a", privacy: "public" }).success).toBe(
            false,
        );
    });

    it("does not rename-check an unchanged username", async () => {
        await saveMobileSettings(10, { section: "general", username: "owner", privacy: "restricted" });
        expect(mocks.findName).not.toHaveBeenCalled();
    });

    it("uses the same image processing and dimensions as web for owner profile covers", async () => {
        mocks.upload.mockResolvedValueOnce("profile.jpg").mockResolvedValueOnce("background.jpg");
        await saveMobileSettings(10, settingsInputSchema.parse({
            section: "general",
            username: "owner",
            privacy: "private",
            profileImage: { data: "aW1hZ2U=", mimeType: "image/jpeg" },
            backgroundImage: { data: "aW1hZ2U=", mimeType: "image/jpeg" }
        }));
        expect(mocks.upload).toHaveBeenNthCalledWith(1, { file: expect.any(File), dirSaveName: "profile-covers", resize: { width: 300, height: 300 } });
        expect(mocks.upload).toHaveBeenNthCalledWith(2, { file: expect.any(File), dirSaveName: "profile-back-covers", resize: { height: 256 } });
        expect(mocks.save).toHaveBeenCalledWith(10, { name: "owner", privacy: "private", image: "profile.jpg", backgroundImage: "background.jpg" });
    });

    it("preserves highlighted media when changing only Continue visibility", async () => {
        const highlights = { overview: { mode: "curated", items: [{ mediaType: "movies", mediaId: 7 }], title: "My favorites" } };
        mocks.getHighlights.mockResolvedValue(highlights);
        await saveMobileSettings(10, { section: "profile", showContinue: false });
        expect(mocks.getHighlights).toHaveBeenCalledWith(10);
        expect(mocks.saveProfile).toHaveBeenCalledWith(10, { ...highlights, showContinue: false });
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("checks pin ownership through the existing repository using the session user", async () => {
        expect(settingsInputSchema.safeParse({ section: "pin", kind: "collection", id: 2, pinned: true, userId: 999 }).success).toBe(false);
        const input = settingsInputSchema.parse({ section: "pin", kind: "collection", id: 2, pinned: true });
        await saveMobileSettings(10, input);
        expect(mocks.setPin).toHaveBeenCalledWith(10, { kind: "collection", id: 2 }, true);
        mocks.setPin.mockImplementation(() => {
            throw new Error("Choose a list or collection you own.");
        });
        await expect(saveMobileSettings(10, input)).rejects.toThrow("you own");
    });

    it("returns only the current user's visibility preference and pin selection", async () => {
        mocks.getVisibility.mockResolvedValue(false);
        mocks.getPins.mockReturnValue([{ kind: "dynamic", id: 4, position: 1 }]);
        expect(await getMobileProfileSettings(10)).toEqual({ showContinue: false, pins: [{ kind: "dynamic", id: 4, position: 1 }] });
        expect(mocks.getVisibility).toHaveBeenCalledWith(10);
        expect(mocks.getPins).toHaveBeenCalledWith(10);
    });

    it("saves content preferences together and invalidates the same stats cache as web", async () => {
        const notifications = { movies: true, series: true, books: false, anime: true, games: false, manga: false };
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
            { anime: true, books: true, games: false, manga: false },
            notifications,
        );
        expect(mocks.del).toHaveBeenCalledOnce();
    });
});
