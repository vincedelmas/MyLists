import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileSocial, actOnMobileSocial, socialListSchema, socialActionSchema} from "./social";


const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    totals: [] as { outgoing: number; status: string; total: number }[],
    follow: vi.fn(),
    status: vi.fn(),
    unfollow: vi.fn(),
    remove: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getUserById: mocks.user },
            social: {
                getFollowingStatus: mocks.status,
                follow: mocks.follow,
                unfollow: mocks.unfollow,
                removeFollower: mocks.remove,
                acceptFollowRequest: mocks.accept,
                declineFollowRequest: mocks.decline,
            },
        },
    }),
}));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => ({
        select: () => {
            const query = {
                from: () => query,
                innerJoin: () => query,
                leftJoin: () => query,
                where: () => query,
                orderBy: () => query,
                limit: () => query,
                offset: async () => [],
                groupBy: async () => mocks.totals,
            };

            return query;
        },
    }),
}));


beforeEach(() => {
    vi.resetAllMocks();
    mocks.totals = [];
    mocks.user.mockResolvedValue({ privacy: "private" });
});


describe("mobile social authorization", () => {
    it("counts incoming and outgoing relationships separately and hides request counts from visitors", async () => {
        mocks.totals = [
            { outgoing: 0, status: "accepted", total: 4 },
            { outgoing: 1, status: "accepted", total: 7 },
            { outgoing: 1, status: "requested", total: 2 },
            { outgoing: 0, status: "requested", total: 1 },
        ];
        expect((await getMobileSocial(10, { kind: "followers", page: 1 })).counts).toEqual({
            followers: 4,
            following: 7,
            requests: 1,
            pending: 2,
        });
        const visitor = await getMobileSocial(10, { kind: "followers", page: 1 }, 30);
        expect(JSON.parse(JSON.stringify(visitor.counts))).toEqual({ followers: 4, following: 7 });
    });
    it.each(["requests", "pending"] as const)("keeps another user's %s private", async (kind) => {
        await expect(getMobileSocial(20, { kind, page: 1 }, 10)).rejects.toThrow("private");
    });
    it("uses the authenticated actor as the follower and checks target privacy", async () => {
        await actOnMobileSocial(10, { targetId: 20, action: "follow" });
        expect(mocks.follow).toHaveBeenCalledWith(10, 20, true);
        mocks.user.mockResolvedValue({ privacy: "restricted" });
        await actOnMobileSocial(10, { targetId: 21, action: "follow" });
        expect(mocks.follow).toHaveBeenLastCalledWith(10, 21, false);
    });
    it("does not re-notify an existing follow or pending request", async () => {
        mocks.status.mockReturnValue({ status: "requested" });
        await actOnMobileSocial(10, { targetId: 20, action: "follow" });
        expect(mocks.follow).not.toHaveBeenCalled();
    });
    it.each([
        ["remove", "remove"],
        ["accept", "accept"],
        ["decline", "decline"],
    ] as const)("%s only changes incoming relationships belonging to the actor", async (action, method) => {
        await actOnMobileSocial(10, { targetId: 20, action });
        expect(mocks[method]).toHaveBeenCalledWith(20, 10);
    });
    it("only cancels the authenticated actor's outgoing relationship", async () => {
        await actOnMobileSocial(10, { targetId: 20, action: "unfollow" });
        expect(mocks.unfollow).toHaveBeenCalledWith(10, 20);
    });
    it("rejects self follows and nonexistent targets", async () => {
        await expect(actOnMobileSocial(10, { targetId: 10, action: "follow" })).rejects.toThrow("yourself");
        mocks.user.mockResolvedValue(null);
        await expect(actOnMobileSocial(10, { targetId: 99, action: "follow" })).rejects.toMatchObject({
            isNotFound: true,
        });
        expect(mocks.follow).not.toHaveBeenCalled();
    });
    it("rejects invalid page sizes, kinds and actions at the API boundary", () => {
        expect(socialListSchema.safeParse({ page: -1 }).success).toBe(false);
        expect(socialListSchema.safeParse({ kind: "allUsers" }).success).toBe(false);
        expect(socialActionSchema.safeParse({ targetId: 0, action: "accept" }).success).toBe(false);
    });
});
