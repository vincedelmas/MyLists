import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getMobileMediaCollections,
    getMobileMediaCommunity,
    getMobileMediaDetails,
    getMobileMediaEdit,
    saveMobileMediaEdit,
} from "./media-sections";
import { UnauthorizedError } from "@/lib/utils/error-classes";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    find: vi.fn(),
    details: vi.fn(),
    community: vi.fn(),
    follows: vi.fn(),
    memberships: vi.fn(),
    collections: vi.fn(),
    edit: vi.fn(),
    save: vi.fn(),
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getUserById: mocks.user },
            collections: {
                getUserCollectionMemberships: mocks.memberships,
                getMediaCommunityCollections: mocks.collections,
            },
        },
        registries: {
            mediaService: {
                get: () => ({
                    findById: mocks.find,
                    getMediaAndUserDetails: mocks.details,
                    getMediaCommunityActivity: mocks.community,
                    getUserFollowsMediaData: mocks.follows,
                    getMediaEditableFields: mocks.edit,
                    updateMediaEditableFields: mocks.save,
                }),
            },
        },
    }),
}));
const params = { mediaType: "movies" as const, mediaId: 7 };
beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 10, role: "user" });
    mocks.find.mockReturnValue({ id: 7 });
    mocks.community.mockResolvedValue({ pages: 2, total: 21, stats: { total: 21 }, items: [] });
    mocks.follows.mockResolvedValue([]);
    mocks.collections.mockResolvedValue([]);
    mocks.edit.mockResolvedValue({
        editableFields: ["name", "imageCover"],
        fields: { name: "Film", internalField: "secret" },
    });
});
describe("mobile media sections", () => {
    it("checks manager permissions on reads and writes, even if the UI tab is bypassed", async () => {
        await expect(getMobileMediaEdit(10, params)).rejects.toBeInstanceOf(UnauthorizedError);
        await expect(saveMobileMediaEdit(10, { ...params, payload: { name: "Changed" } })).rejects.toBeInstanceOf(
            UnauthorizedError,
        );
        expect(mocks.edit).not.toHaveBeenCalled();
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("uses the catalog editable-field policy and existing update service for managers", async () => {
        mocks.user.mockResolvedValue({ id: 10, role: "manager" });
        expect(await getMobileMediaEdit(10, params)).toEqual([
            { key: "name", value: "Film" },
            { key: "imageCover", value: "" },
        ]);
        await saveMobileMediaEdit(10, { ...params, payload: { name: "Changed" } });
        expect(mocks.save).toHaveBeenCalledWith(7, { name: "Changed" });
    });
    it("scopes collection memberships to the authenticated user and validates the title", async () => {
        await getMobileMediaCollections(10, params);
        expect(mocks.memberships).toHaveBeenCalledWith(10, 7, "movies");
        mocks.find.mockReturnValue(null);
        await expect(getMobileMediaCollections(10, params)).rejects.toMatchObject({ isNotFound: true });
    });
    it("uses community visibility rules, omits private notes and returns follows only on the first page", async () => {
        const person = {
            id: 20,
            name: "Other",
            image: "http://localhost:3000/avatar.jpg",
            ratingSystem: "score",
            userMedia: {
                status: "Completed",
                rating: 8,
                favorite: true,
                comment: "private note",
                releaseNotificationsEnabled: true,
                lastUpdated: "2026-10-21 12:00:00",
            },
        };
        mocks.community.mockResolvedValue({ pages: 2, total: 21, stats: {}, items: [person] });
        mocks.follows.mockResolvedValue([person]);
        const result = await getMobileMediaCommunity(10, params, 1);
        expect(mocks.community).toHaveBeenCalledWith({ kind: "user", id: 10, role: "user" }, 7, {
            page: 1,
            perPage: 20,
        });
        expect(result.follows[0]).toMatchObject({ image: "/avatar.jpg", rating: 8 });
        expect(JSON.stringify(result)).not.toContain("private note");
        expect(JSON.stringify(result)).not.toContain("releaseNotificationsEnabled");
        mocks.follows.mockClear();
        expect((await getMobileMediaCommunity(10, params, 2)).follows).toEqual([]);
        expect(mocks.follows).not.toHaveBeenCalled();
    });
    it("returns compact associated metadata without returning raw ingestion fields", async () => {
        mocks.details.mockResolvedValue({
            media: { genres: [{ id: 1, name: "Drama" }], actors: [{ id: 1, name: "Actor" }], internalField: "secret" },
            similarMedia: [{ mediaId: 8, mediaName: "Similar", mediaCover: "http://localhost:3000/cover.jpg" }],
        });
        const result = await getMobileMediaDetails(10, params);
        expect(result.actors).toEqual([{ id: 1, name: "Actor" }]);
        expect(result.similar[0].mediaCover).toBe("/cover.jpg");
        expect(mocks.collections).toHaveBeenCalledWith(7, "movies", { kind: "user", id: 10, role: "user" });
        expect(JSON.stringify(result)).not.toContain("secret");
    });
});
