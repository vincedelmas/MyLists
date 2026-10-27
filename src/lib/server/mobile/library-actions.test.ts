import {beforeEach, describe, expect, it, vi} from "vitest";
import {actOnMobileLibrary, getMobileLibraryEditor, libraryActionSchema} from "./library-actions";

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), remove: vi.fn(), collection: vi.fn(), saveCollection: vi.fn(), deleteCollection: vi.fn(), pin: vi.fn() }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            collections: {
                getCollectionDetails: mocks.collection,
                updateCollection: mocks.saveCollection,
                deleteCollection: mocks.deleteCollection
            }
        }
    })
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({ dynamicListsRepository: { get: mocks.get, update: mocks.update, delete: mocks.remove } }));
vi.mock("@/lib/server/domain/profile/profile-pins.repository", () => ({ profilePinsRepository: { set: mocks.pin } }));
beforeEach(() => vi.resetAllMocks());
describe("mobile saved-list management", () => {
    it("uses the session owner for dynamic reads and removals", async () => {
        await getMobileLibraryEditor(10, { kind: "dynamic", id: 20 });
        expect(mocks.get).toHaveBeenCalledWith(10, 20);
        await actOnMobileLibrary(10, { action: "delete", kind: "dynamic", id: 20 });
        expect(mocks.remove).toHaveBeenCalledWith(10, 20);
    });
    it("preserves collection policy failures before changing metadata", async () => {
        mocks.collection.mockRejectedValue(new Error("Unauthorized"));
        await expect(actOnMobileLibrary(10, { action: "collection", id: 20, title: "Collection", privacy: "private", ordered: false })).rejects.toThrow("Unauthorized");
        expect(mocks.saveCollection).not.toHaveBeenCalled();
        expect(mocks.collection).toHaveBeenCalledWith(20, "edit", { kind: "user", id: 10, role: "user" });
    });
    it("keeps all collection items and annotations during metadata edits", async () => {
        mocks.collection.mockResolvedValue({ items: [{ mediaId: 1, mediaType: "books", annotation: "Keep me" }] });
        await actOnMobileLibrary(10, { action: "collection", id: 20, title: "Updated", privacy: "private", ordered: true });
        expect(mocks.saveCollection).toHaveBeenCalledWith(expect.objectContaining({
            collectionId: 20,
            title: "Updated",
            items: [{ mediaId: 1, mediaType: "books", annotation: "Keep me" }]
        }));
    });
    it("uses the shared pin policy and rejects forged actor payloads", async () => {
        expect(() => libraryActionSchema.parse({ action: "pin", kind: "collection", id: 20, pinned: true, userId: 99 })).toThrow();
        const input = libraryActionSchema.parse({ action: "pin", kind: "collection", id: 20, pinned: true });
        await actOnMobileLibrary(10, input);
        expect(mocks.pin).toHaveBeenCalledWith(10, input, true);
        expect(input).not.toHaveProperty("userId");
    });
});
