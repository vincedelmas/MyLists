import {beforeEach, describe, expect, it, vi} from "vitest";
import {DenialReason, PrivacyType, RoleType} from "@/lib/utils/enums";


const mocks = vi.hoisted(() => ({
    getContainer: vi.fn(),
}));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: mocks.getContainer,
}));


vi.mock("@/lib/schemas", () => ({
    baseUsernameSchema: {
        safeParse: (data: unknown) => ({ success: true, data }),
    },
}));


const { contentAuthorizationMiddleware, publicPreviewMiddleware } = await import("@/lib/server/middlewares/authorization");


describe("profile authorization middleware boundaries", () => {
    const decideProfile = vi.fn();
    const getUserByUsername = vi.fn();

    const currentUser = { id: 20, role: RoleType.USER };
    const targetUser = { id: 10, name: "private-user", privacy: PrivacyType.PRIVATE };

    beforeEach(() => {
        vi.clearAllMocks();
        getUserByUsername.mockResolvedValue(targetUser);
        decideProfile.mockResolvedValue({ allowed: true });
        mocks.getContainer.mockResolvedValue({
            services: {
                user: { getUserByUsername },
                authorization: { decideProfile },
            },
        });
    });

    it("resolves private users for public header previews without authorizing profile content", async () => {
        const next = vi.fn().mockResolvedValue("preview");
        const runMiddleware = publicPreviewMiddleware.options.server as any;

        await expect(runMiddleware({ next, context: { currentUser }, data: { username: targetUser.name } })).resolves.toBe("preview");

        expect(getUserByUsername).toHaveBeenCalledWith(targetUser.name);
        expect(decideProfile).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith({ context: { targetUser, currentUser } });
    });

    it("blocks restricted profile content with the restricted UI error", async () => {
        const next = vi.fn();
        const runMiddleware = contentAuthorizationMiddleware.options.server as any;
        decideProfile.mockResolvedValue({ allowed: false, reason: DenialReason.PROFILE_RESTRICTED });

        await expect(runMiddleware({ next, context: { targetUser, currentUser: undefined } })).rejects.toMatchObject({
            name: "UnauthorizedError",
            type: "restricted",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("passes authorized profile content under the protected user context", async () => {
        const next = vi.fn().mockResolvedValue("content");
        const runMiddleware = contentAuthorizationMiddleware.options.server as any;

        await expect(runMiddleware({ next, context: { targetUser, currentUser } })).resolves.toBe("content");

        expect(next).toHaveBeenCalledWith({
            context: {
                currentUser,
                user: targetUser,
            },
        });
    });
});
