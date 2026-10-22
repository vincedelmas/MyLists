import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaRefreshAvailability, refreshCatalogMedia } from "./media-refresh";
import { toActor } from "@/lib/server/authorization";

const mocks = vi.hoisted(() => ({ find: vi.fn(), refresh: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: { admin: { logMediaRefresh: mocks.log } },
        registries: {
            mediaService: { get: () => ({ findById: mocks.find }) },
            ingestionServices: { get: () => ({ refreshFromExternal: mocks.refresh }) },
        },
    }),
}));
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn() } }));
const user = toActor({ id: 10 });
const manager = toActor({ id: 20, role: "manager" });
beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    mocks.find.mockReturnValue({ apiId: 7, lastApiUpdate: "2026-10-22 11:00:00" });
    mocks.log.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());
describe("shared catalog refresh policy", () => {
    it("provides the exact cooldown and enforces it on writes", async () => {
        expect(getMediaRefreshAvailability(user, "movies", mocks.find())).toMatchObject({
            allowed: false,
            nextAllowedAt: "2026-10-23T11:00:00.000Z",
        });
        await expect(refreshCatalogMedia(user, "movies", 1)).rejects.toThrow("24 hours");
        expect(mocks.refresh).not.toHaveBeenCalled();
    });
    it("allows normal users at the cooldown boundary and logs the real actor", async () => {
        mocks.find.mockReturnValue({ apiId: 7, lastApiUpdate: "2026-10-21 12:00:00" });
        expect(await refreshCatalogMedia(user, "movies", 1)).toEqual({ kind: "saved" });
        expect(mocks.refresh).toHaveBeenCalledWith(7);
        expect(mocks.log).toHaveBeenCalledWith({ userId: 10, mediaType: "movies", apiId: 7 });
    });
    it("lets managers bypass cooldowns while retaining the audit log", async () => {
        await refreshCatalogMedia(manager, "movies", 1);
        expect(mocks.refresh).toHaveBeenCalledWith(7);
        expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ userId: 20 }));
    });
    it("keeps book refresh manager-only and disallows manual books even for managers", async () => {
        expect(getMediaRefreshAvailability(user, "books", { apiId: "google-id", lastApiUpdate: null }).allowed).toBe(
            false,
        );
        expect(
            getMediaRefreshAvailability(manager, "books", { apiId: "manual:123", lastApiUpdate: null }).allowed,
        ).toBe(false);
    });
    it("rejects anonymous actors and missing media before ingestion", async () => {
        await expect(refreshCatalogMedia(toActor(), "movies", 1)).rejects.toThrow("Sign in");
        mocks.find.mockReturnValue(null);
        await expect(refreshCatalogMedia(user, "movies", 1)).rejects.toThrow("not found");
        expect(mocks.refresh).not.toHaveBeenCalled();
    });
});
