import {beforeEach, describe, expect, it, vi} from "vitest";
import {actOnMobileMedia, getMobileMediaHistory, getMobileMediaTags, mobileMediaActionSchema} from "./media-personal";


const mocks = vi.hoisted(() => ({
    tag: vi.fn(),
    tags: vi.fn(),
    notifications: vi.fn(),
    cover: vi.fn(),
    bookCover: vi.fn(),
    history: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    create: vi.fn()
}));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            updateHistory: { getUserMediaHistory: mocks.history },
            collections: { addMediaToCollection: mocks.add, removeMediaFromCollection: mocks.remove, createCollection: mocks.create }
        },
        registries: {
            mediaService: {
                get: () => ({
                    editUserTag: mocks.tag,
                    getTagNames: mocks.tags,
                    updateUserMediaNotifications: mocks.notifications,
                    updateUserCustomCover: mocks.cover,
                    updateDefaultCover: mocks.bookCover
                })
            }
        },
    })
}));


const media = { mediaType: "books" as const, mediaId: 7 };


beforeEach(() => vi.resetAllMocks());


describe("mobile personal media actions", () => {
    it("uses only the session owner for tags, preferences and history", async () => {
        const input = mobileMediaActionSchema.parse({
            action: "tag",
            name: "  Favorites  ",
            selected: true,
            userId: 999
        });
        await actOnMobileMedia(10, media, input);
        expect(mocks.tag).toHaveBeenCalledWith(10, { name: "Favorites" }, "add", 7);
        await actOnMobileMedia(10, media, { action: "tag", name: "Favorites", selected: false });
        expect(mocks.tag).toHaveBeenLastCalledWith(10, { name: "Favorites" }, "deleteOne", 7);
        await actOnMobileMedia(10, media, { action: "notifications", enabled: false });
        expect(mocks.notifications).toHaveBeenCalledWith(10, 7, false);
        await getMobileMediaTags(10, media);
        expect(mocks.tags).toHaveBeenCalledWith(10);
        mocks.history.mockReturnValue([
            { id: 1, timestamp: "2026-10-01 12:00:00" }
        ]);
        expect(await getMobileMediaHistory(10, media)).toEqual({
            page: 1,
            hasMore: false,
            items: [
                { id: 1, timestamp: "2026-10-01T12:00:00.000Z" }
            ]
        });
        expect(mocks.history).toHaveBeenCalledWith(10, "books", 7, { limit: 31, offset: 0 });
    });
    it("returns bounded history pages without returning another user's history", async () => {
        mocks.history.mockReturnValue(Array.from({ length: 31 }, (_, id) => ({ id, timestamp: "2026-10-01 12:00:00" })));
        const result = await getMobileMediaHistory(10, media, 2);
        expect(result.items).toHaveLength(30);
        expect(result.hasMore).toBe(true);
        expect(mocks.history).toHaveBeenCalledWith(10, "books", 7, { limit: 31, offset: 30 });
    });
    it("delegates collection authorization to the same actor policy as the web", async () => {
        const denied = new Error("Unauthorized to update this collection.");
        mocks.add.mockImplementation(() => {
            throw denied;
        });
        await expect(actOnMobileMedia(10, media, { action: "collection", collectionId: 88, selected: true })).rejects.toBe(denied);
        expect(mocks.add).toHaveBeenCalledWith({
            ...media,
            collectionId: 88,
            actor: { kind: "user", id: 10, role: "user" }
        });
        await actOnMobileMedia(10, media, { action: "collection", collectionId: 88, selected: false });
        expect(mocks.remove).toHaveBeenCalledWith({
            ...media,
            collectionId: 88,
            actor: { kind: "user", id: 10, role: "user" }
        });
    });
    it("creates a private collection owned by the session with this title already added", async () => {
        await actOnMobileMedia(10, media, { action: "create-collection", title: "To read" });
        expect(mocks.create).toHaveBeenCalledWith({
            ownerId: 10,
            title: "To read",
            ordered: false,
            privacy: "private",
            items: [media]
        });
    });
    it("validates cover source exclusivity and scopes cover changes to the session", async () => {
        await actOnMobileMedia(10, media, { action: "cover", remove: true });
        expect(mocks.cover).toHaveBeenCalledWith(10, expect.objectContaining({ ...media, remove: true }));
        mocks.cover.mockClear();
        await expect(actOnMobileMedia(10, media, { action: "cover", remove: true, imageUrl: "https://example.com/cover.jpg" }))
            .rejects.toThrow();
        await expect(actOnMobileMedia(10, media, { action: "cover", remove: false })).rejects.toThrow();
        expect(mocks.cover).not.toHaveBeenCalled();
    });
    it("decodes mobile image uploads and passes through the shared file validation", async () => {
        await actOnMobileMedia(10, media, {
            action: "cover",
            remove: false,
            image: { data: "aW1hZ2U=", mimeType: "image/jpeg" }
        });
        const [owner, input] = mocks.cover.mock.calls[0];
        expect(owner).toBe(10);
        expect(input.imageFile).toBeInstanceOf(File);
        expect(await input.imageFile.text()).toBe("image");
        expect(input.imageFile.type).toBe("image/jpeg");
    });
    it("restricts community cover contributions to books and preserves the service's default-cover rule", async () => {
        await expect(actOnMobileMedia(10, { mediaType: "games", mediaId: 7 }, { action: "book-cover", imageUrl: "https://example.com/cover.jpg" }))
            .rejects.toThrow("Only books");
        mocks.bookCover.mockRejectedValue(new Error("This book already has a cover"));
        await expect(actOnMobileMedia(10, media, { action: "book-cover", imageUrl: "https://example.com/cover.jpg" })).rejects.toThrow("already has a cover");
        expect(mocks.bookCover).toHaveBeenCalledWith(7, expect.objectContaining({ imageUrl: "https://example.com/cover.jpg" }));
    });
    it("rejects invalid action inputs before writing", () => {
        for (const input of [
            { action: "tag", name: "  ", selected: true },
            { action: "notifications", enabled: "false" },
            {
                action: "collection",
                collectionId: -1,
                selected: true
            },
            { action: "create-collection", title: "ab" },
            {
                action: "cover",
                image: { data: "invalid!", mimeType: "text/html" }
            }
        ]) expect(mobileMediaActionSchema.safeParse(input).success).toBe(false);
    });
});
