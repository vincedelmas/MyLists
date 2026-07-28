import {describe, expect, it, vi} from "vitest";
import {toActor} from "@/lib/server/authorization/utils";
import {UserService} from "@/lib/server/domain/user/user.service";
import {DenialReason, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {AuthorizationService} from "@/lib/server/authorization/authorization.service";


const createService = (status?: SocialState) => {
    const getFollowingStatus = vi.fn().mockResolvedValue(status ? { status } : null);
    const userService = { getFollowingStatus } as unknown as UserService;

    return {
        getFollowingStatus,
        service: new AuthorizationService(userService),
    };
};


describe("AuthorizationService", () => {
    it("allows an accepted follower to read a private profile", async () => {
        const { getFollowingStatus, service } = createService(SocialState.ACCEPTED);

        const actor = toActor({ id: 20, role: RoleType.USER });
        const decision = await service.decideProfile(actor, { id: 10, privacy: PrivacyType.PRIVATE });

        expect(decision.allowed).toBe(true);
        expect(getFollowingStatus).toHaveBeenCalledWith(20, 10);
    });

    it("does not load a follower relationship for public profiles", async () => {
        const { getFollowingStatus, service } = createService();

        const actor = toActor({ id: 20, role: RoleType.USER });
        const decision = await service.decideProfile(actor, { id: 10, privacy: PrivacyType.PUBLIC });

        expect(decision.allowed).toBe(true);
        expect(getFollowingStatus).not.toHaveBeenCalled();
    });

    it("denies requested and missing followers access to private profiles", async () => {
        for (const status of [SocialState.REQUESTED, undefined]) {
            const { service } = createService(status);
            const actor = toActor({ id: 20, role: RoleType.USER });

            const decision = await service.decideProfile(actor, { id: 10, privacy: PrivacyType.PRIVATE });

            expect(decision.allowed).toBe(false);
        }
    });

    it("does not load a relationship when the profile owner reads their profile", async () => {
        const { getFollowingStatus, service } = createService();
        const owner = toActor({ id: 10, role: RoleType.USER });

        const decision = await service.decideProfile(owner, { id: 10, privacy: PrivacyType.PRIVATE });

        expect(decision.allowed).toBe(true);
        expect(getFollowingStatus).not.toHaveBeenCalled();
    });

    it("resolves follower-aware access for restricted collections on private profiles", async () => {
        const { getFollowingStatus, service } = createService(SocialState.ACCEPTED);
        const actor = toActor({ id: 20, role: RoleType.USER });
        const collection = {
            ownerId: 10,
            privacy: PrivacyType.RESTRICTED,
            ownerPrivacy: PrivacyType.PRIVATE,
        };

        for (const action of ["read", "like", "copy"] as const) {
            await expect(service.decideCollection(actor, action, collection))
                .resolves.toEqual({ allowed: true });
        }

        expect(getFollowingStatus).toHaveBeenCalledTimes(3);
        expect(getFollowingStatus).toHaveBeenNthCalledWith(1, 20, 10);
    });

    it("denies non-followers follower-aware collection actions", async () => {
        const { service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });
        const collection = {
            ownerId: 10,
            privacy: PrivacyType.RESTRICTED,
            ownerPrivacy: PrivacyType.PRIVATE,
        };

        for (const action of ["read", "like", "copy"] as const) {
            const decision = await service.decideCollection(actor, action, collection);
            expect(decision).toEqual({ allowed: false, reason: DenialReason.PROFILE_PRIVATE });
        }
    });

    it("hydrates follower-aware collection capabilities", async () => {
        const { getFollowingStatus, service } = createService(SocialState.ACCEPTED);
        const actor = toActor({ id: 20, role: RoleType.USER });
        const collection = {
            ownerId: 10,
            privacy: PrivacyType.RESTRICTED,
            ownerPrivacy: PrivacyType.PRIVATE,
        };

        const capabilities = await service.getCollectionCapabilities(actor, collection);

        expect(capabilities).toMatchObject({
            read: true,
            like: true,
            copy: true,
            edit: false,
            delete: false,
        });
        expect(getFollowingStatus).toHaveBeenCalledOnce();
        expect(getFollowingStatus).toHaveBeenCalledWith(20, 10);
    });

    it("does not query relationships for collection actions that do not need them", async () => {
        const { getFollowingStatus, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });
        const collection = {
            ownerId: 10,
            privacy: PrivacyType.PUBLIC,
            ownerPrivacy: PrivacyType.PRIVATE,
        };

        await expect(service.decideCollection(actor, "read", collection))
            .resolves.toEqual({ allowed: true });

        expect(getFollowingStatus).not.toHaveBeenCalled();
    });
});
