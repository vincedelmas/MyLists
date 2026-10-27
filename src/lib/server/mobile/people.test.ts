import {beforeEach, describe, expect, it, vi} from "vitest";
import {resolveMobileProfileUser} from "./profile-access";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {getMobilePerson} from "./people";


const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    decide: vi.fn(),
    following: vi.fn(),
    profile: vi.fn(),
    activity: vi.fn(),
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("./profile", () => ({ getMobileProfile: mocks.profile, getMobileProfileActivity: mocks.activity }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getUserById: mocks.user },
            authorization: { decideProfile: mocks.decide },
            social: { getFollowingStatus: mocks.following },
        },
    }),
}));


beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({
        id: 20,
        name: "Other",
        userMediaSettings: [
            { mediaType: "movies", active: true, timeSpent: 240 }
        ],
        privacy: "private",
        createdAt: "2026-01-01 00:00:00",
        image: "/avatar.jpg",
        backgroundImage: "/background.jpg",
        email: "secret@example.invalid",
    });
    mocks.decide.mockResolvedValue({ allowed: false, reason: "private" });
    mocks.following.mockReturnValue({ status: "requested" });
    mocks.profile.mockResolvedValue({ user: { id: 20 } });
    mocks.activity.mockResolvedValue([]);
});


describe("mobile visitor profiles", () => {
    it("checks the visitor's access before loading any private activity or stats", async () => {
        const data = await getMobilePerson(10, 20);
        expect(mocks.decide).toHaveBeenCalledWith(
            { id: 10, kind: "user", role: "user" },
            expect.objectContaining({ id: 20 }),
        );
        expect(data).toMatchObject({
            access: "private",
            following: "requested",
            header: { id: 20, image: "/avatar.jpg" },
        });
        expect(data).not.toHaveProperty("profile");
        expect(data?.header).not.toHaveProperty("email");
        expect(mocks.profile).not.toHaveBeenCalled();
        expect(mocks.activity).not.toHaveBeenCalled();
    });

    it("loads the selected user's content after the shared privacy policy allows access", async () => {
        mocks.decide.mockResolvedValue({ allowed: true });
        expect(await getMobilePerson(10, 20)).toMatchObject({
            access: "allowed",
            profile: { user: { id: 20 } }
        });
        expect(mocks.profile).toHaveBeenCalledWith(20);
        expect(mocks.activity).not.toHaveBeenCalled();
        expect(mocks.following).toHaveBeenCalledWith(10, 20);
    });

    it("returns missing users without evaluating their content", async () => {
        mocks.user.mockResolvedValue(null);
        expect(await getMobilePerson(10, 20)).toBeNull();
        expect(mocks.decide).not.toHaveBeenCalled();
    });
});


describe("mobile profile resource authorization", () => {
    const request = (query = "") => new Request(`http://localhost/api/mobile/v1/profile/stats${query}`);
    it("defaults to the authenticated subject and skips visitor lookups for self", async () => {
        expect(await resolveMobileProfileUser(request(), 10)).toBe(10);
        expect(await resolveMobileProfileUser(request("?userId=10"), 10)).toBe(10);
        expect(mocks.user).not.toHaveBeenCalled();
    });
    it("checks the actual visitor on every resource request, including after access is revoked", async () => {
        mocks.decide.mockResolvedValueOnce({ allowed: true });
        expect(await resolveMobileProfileUser(request("?userId=20"), 10)).toBe(20);
        await expect(resolveMobileProfileUser(request("?userId=20"), 10)).rejects.toBeInstanceOf(UnauthorizedError);
        expect(mocks.decide).toHaveBeenCalledTimes(2);
        expect(mocks.decide).toHaveBeenLastCalledWith(
            { id: 10, kind: "user", role: "user" },
            expect.objectContaining({ id: 20 }),
        );
    });
    it("rejects invalid subjects and missing profiles", async () => {
        await expect(resolveMobileProfileUser(request("?userId=-1"), 10)).rejects.toThrow();
        expect(mocks.user).not.toHaveBeenCalled();
        mocks.user.mockResolvedValue(null);
        await expect(resolveMobileProfileUser(request("?userId=999"), 10)).rejects.toMatchObject({ isNotFound: true });
        expect(mocks.decide).not.toHaveBeenCalled();
    });
});
