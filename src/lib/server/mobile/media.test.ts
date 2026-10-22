import { beforeEach, describe, expect, it, vi } from "vitest";
import { addMobileMedia, getMobileList, getMobileMedia, removeMobileMedia, updateMobileMedia } from "./media";
import { ActivityCorrectionRequired } from "@/lib/server/domain/tracking/monthly-activity.service";

const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    list: vi.fn(),
    find: vi.fn(),
    tracking: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getUserById: mocks.user },
            mediaTracking: {
                addMediaToList: mocks.add,
                updateUserMedia: mocks.update,
                removeMediaFromList: mocks.remove,
            },
        },
        registries: {
            mediaService: {
                get: () => ({ getMediaList: mocks.list, findById: mocks.find, findUserMedia: mocks.tracking }),
            },
        },
    }),
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({
        ratingSystem: "score",
        userMediaSettings: [
            { mediaType: "movies", active: true },
            { mediaType: "books", active: false },
        ],
    });
    mocks.list.mockResolvedValue({
        pagination: { page: 1, totalPages: 2 },
        items: [
            {
                mediaId: 7,
                mediaName: "Film",
                imageCover: "http://localhost:3000/static/cover.jpg",
                status: "Completed",
                rating: 8,
                favorite: true,
            },
        ],
    });
    mocks.find.mockReturnValue({
        id: 7,
        name: "Film",
        imageCover: "http://localhost:3000/static/cover.jpg",
        synopsis: "A story",
        duration: 123,
        directorName: "A Director",
        internalField: "must not be exposed",
        releaseDate: "2026-01-01",
    });
    mocks.tracking.mockReturnValue(null);
});

describe("mobile media operations", () => {
    it("enforces active-list publication before querying items", async () => {
        await expect(getMobileList(10, "books", {})).rejects.toMatchObject({ mediaType: "books" });
        expect(mocks.list).not.toHaveBeenCalled();
    });

    it("paginates on the server with a fixed page size and session-owned scope", async () => {
        const result = await getMobileList(10, "movies", {
            page: 2,
            search: "Film",
            favorite: "true",
            status: "Completed",
        });
        expect(mocks.list).toHaveBeenCalledWith(
            10,
            10,
            expect.objectContaining({ page: 2, perPage: 30, favorite: true, status: ["Completed"] }),
        );
        expect(result.items[0]).toMatchObject({ mediaId: 7, cover: "/static/cover.jpg" });
    });

    it("keeps the list subject and viewer distinct for visited profiles", async () => {
        await getMobileList(20, "movies", {}, 10);
        expect(mocks.list).toHaveBeenCalledWith(10, 20, expect.objectContaining({ perPage: 30 }));
        expect(mocks.user).toHaveBeenCalledWith(20);
    });

    it("rejects statuses belonging to another media type", async () => {
        await expect(getMobileList(10, "movies", { status: "Reading" })).rejects.toThrow();
        expect(mocks.list).not.toHaveBeenCalled();
    });

    it("reads lightweight details without fetching community or related-media graphs", async () => {
        const result = await getMobileMedia(10, { mediaType: "movies", mediaId: 7 });
        expect(mocks.tracking).toHaveBeenCalledWith(10, 7);
        expect(result.media.cover).toBe("/static/cover.jpg");
        expect(result.media.facts).toEqual(
            expect.arrayContaining([
                { label: "Runtime (minutes)", value: "123" },
                { label: "Director", value: "A Director" },
            ]),
        );
        expect(JSON.stringify(result.media)).not.toContain("must not be exposed");
        expect(result.active).toBe(true);
        expect(result.seasons).toBeNull();
    });

    it("delegates writes to the existing tracking service with server-owned identity", async () => {
        const params = { mediaType: "movies" as const, mediaId: 7 };
        await addMobileMedia(10, params);
        await updateMobileMedia(10, { ...params, payload: { type: "rating", rating: 8 } });
        await removeMobileMedia(10, params);
        expect(mocks.add).toHaveBeenCalledWith({ ...params, userId: 10 });
        expect(mocks.update).toHaveBeenCalledWith({ ...params, userId: 10, payload: { type: "rating", rating: 8 } });
        expect(mocks.remove).toHaveBeenCalledWith({ ...params, userId: 10 });
    });

    it("preserves correction previews and sends the user's explicit decision back to the service", async () => {
        const preview = { version: "a".repeat(64), progressRemoved: 10, redoRemoved: 0, months: [] };
        mocks.update.mockImplementationOnce(() => {
            throw new ActivityCorrectionRequired(preview);
        });
        const input = { mediaType: "books" as const, mediaId: 7, payload: { type: "page" as const, actualPage: 10 } };
        expect(await updateMobileMedia(10, input)).toEqual({ kind: "correction-required", preview });
        expect(
            await updateMobileMedia(10, {
                ...input,
                activityCorrection: { version: preview.version, keepHistory: true },
            }),
        ).toEqual({ kind: "saved" });
        expect(mocks.update).toHaveBeenLastCalledWith({
            ...input,
            userId: 10,
            activityCorrection: { version: preview.version, keepHistory: true },
        });
    });
});
