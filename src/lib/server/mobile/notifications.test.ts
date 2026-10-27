import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    getMobileNotificationCounts,
    getMobileNotifications,
    actOnMobileNotification,
    mobileNotificationActionSchema,
} from "./notifications";


const mocks = vi.hoisted(() => ({
    list: vi.fn(),
    counts: vi.fn(),
    read: vi.fn(),
    remove: vi.fn()
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            notifications: {
                getLastNotifications: mocks.list,
                countUnreadNotifications: mocks.counts,
                markAllAsRead: mocks.read,
                deleteSocialNotif: mocks.remove,
            },
        },
    }),
}));


beforeEach(() => vi.resetAllMocks());


describe("mobile notifications", () => {
    it("loads counts and notifications for the authenticated recipient only", async () => {
        mocks.counts.mockResolvedValue({ media: 2, social: 1, total: 3 });
        expect(await getMobileNotificationCounts(10)).toEqual({ media: 2, social: 1, total: 3 });
        expect(mocks.counts).toHaveBeenCalledWith(10);
        mocks.list.mockResolvedValue([
            {
                id: 1,
                userId: 10,
                actorId: 20,
                type: "followRequested",
                read: false,
                createdAt: "2026-10-22 12:00:00",
                actor: { id: 20, name: "Other", image: "http://localhost:3000/avatar.jpg" },
                featureRequest: null,
            },
        ]);
        const [item] = await getMobileNotifications(10, "social");
        expect(mocks.list).toHaveBeenCalledWith(10, "social", 30);
        expect(item).toMatchObject({
            kind: "social",
            actor: { id: 20, image: "/avatar.jpg" },
            createdAt: "2026-10-22T12:00:00.000Z",
        });
        expect(item).not.toHaveProperty("userId");
    });
    it("preserves release and episode details", async () => {
        mocks.list.mockResolvedValue([
            {
                id: 2,
                userId: 10,
                name: "Show",
                mediaType: "series",
                mediaId: 5,
                season: 2,
                episode: 10,
                isSeasonFinale: true,
                read: false,
                releaseDate: "2026-11-01",
                createdAt: "2026-10-22 12:00:00",
            },
        ]);
        expect((await getMobileNotifications(10, "media"))[0]).toMatchObject({
            kind: "media",
            season: 2,
            episode: 10,
            isSeasonFinale: true,
            releaseDate: "2026-11-01",
        });
    });
    it("scopes read and delete operations to the session, ignoring client identity fields", async () => {
        await actOnMobileNotification(
            10,
            mobileNotificationActionSchema.parse({ action: "delete", notificationId: 8, userId: 999 }),
        );
        expect(mocks.remove).toHaveBeenCalledWith(10, 8);
        await actOnMobileNotification(10, { action: "read", type: "media" });
        expect(mocks.read).toHaveBeenCalledWith(10, "media");
        expect(mobileNotificationActionSchema.safeParse({ action: "delete", notificationId: -1 }).success).toBe(false);
    });
});
