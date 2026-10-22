import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMobilePerson } from "./people";

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
        privacy: "private",
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
        expect(await getMobilePerson(10, 20)).toMatchObject({ access: "allowed", profile: { user: { id: 20 } } });
        expect(mocks.profile).toHaveBeenCalledWith(20);
        expect(mocks.activity).toHaveBeenCalledWith(20);
        expect(mocks.following).toHaveBeenCalledWith(10, 20);
    });

    it("returns missing users without evaluating their content", async () => {
        mocks.user.mockResolvedValue(null);
        expect(await getMobilePerson(10, 20)).toBeNull();
        expect(mocks.decide).not.toHaveBeenCalled();
    });
});
