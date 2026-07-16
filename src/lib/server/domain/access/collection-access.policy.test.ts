import {describe, expect, it} from "vitest";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {decideCollectionAccess} from "@/lib/server/domain/access/collection-access.policy";


const resource = (visibility: PrivacyType, ownerPrivacy: PrivacyType = PrivacyType.PRIVATE) => ({
    ownerId: 10,
    visibility,
    ownerPrivacy,
});


describe("collection access policy", () => {
    it("keeps public collections global even when the owner account is private", () => {
        expect(decideCollectionAccess(resource(PrivacyType.PUBLIC), {})).toEqual({ allowed: true, reason: "public" });
    });

    it("keeps only-me collections owner-only for ordinary actors", () => {
        expect(decideCollectionAccess(resource(PrivacyType.PRIVATE), { id: 20 })).toEqual({ allowed: false, reason: "private" });
        expect(decideCollectionAccess(resource(PrivacyType.PRIVATE), { id: 10 })).toEqual({ allowed: true, reason: "owner" });
    });

    it.each([
        [PrivacyType.PUBLIC, undefined, undefined, true, "profile-public"],
        [PrivacyType.RESTRICTED, undefined, undefined, false, "restricted"],
        [PrivacyType.RESTRICTED, 20, undefined, true, "authenticated"],
        [PrivacyType.PRIVATE, undefined, undefined, false, "private"],
        [PrivacyType.PRIVATE, 20, SocialState.REQUESTED, false, "private"],
        [PrivacyType.PRIVATE, 20, SocialState.ACCEPTED, true, "accepted-follower"],
    ] as const)("applies profile-only visibility to the owner audience", (ownerPrivacy, actorId, followingStatus, allowed, reason) => {
        expect(decideCollectionAccess(resource(PrivacyType.RESTRICTED, ownerPrivacy), { id: actorId, followingStatus }))
            .toEqual({ allowed, reason });
    });

    it("allows managers to inspect and manage without changing collection publication", () => {
        expect(decideCollectionAccess(resource(PrivacyType.PRIVATE), { id: 20, role: RoleType.MANAGER }, "manage"))
            .toEqual({ allowed: true, reason: "moderator" });
        expect(decideCollectionAccess(resource(PrivacyType.PUBLIC), { id: 20 }, "manage"))
            .toEqual({ allowed: false, reason: "private" });
    });
});
