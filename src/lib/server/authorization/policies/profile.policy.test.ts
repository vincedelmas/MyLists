import {describe, expect, it} from "vitest";
import {DenialReason, PrivacyType, RoleType} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization/utils";
import {profilePolicy} from "@/lib/server/authorization/policies/profile.policy";


const profile = (privacy: PrivacyType) => {
    return ({ id: 10, privacy });
}


describe("profilePolicy", () => {
    it("allows anonymous users to read only public profiles", () => {
        const actor = toActor();

        expect(profilePolicy.decide(actor, profile(PrivacyType.PUBLIC))).toEqual({ allowed: true });
        expect(profilePolicy.decide(actor, profile(PrivacyType.RESTRICTED))).toEqual({
            allowed: false,
            reason: DenialReason.PROFILE_RESTRICTED,
        });
        expect(profilePolicy.decide(actor, profile(PrivacyType.PRIVATE))).toEqual({
            allowed: false,
            reason: DenialReason.PROFILE_PRIVATE,
        });
    });

    it("allows authenticated users to read restricted profiles", () => {
        const actor = toActor({ id: 20, role: RoleType.USER });

        expect(profilePolicy.decide(actor, profile(PrivacyType.RESTRICTED))).toEqual({ allowed: true });
        expect(profilePolicy.decide(actor, profile(PrivacyType.PRIVATE))).toEqual({
            allowed: false,
            reason: DenialReason.PROFILE_PRIVATE,
        });
    });

    it("allows owners, accepted followers, and admins to read private profiles", () => {
        const target = profile(PrivacyType.PRIVATE);
        const owner = toActor({ id: 10, role: RoleType.USER });
        const admin = toActor({ id: 30, role: RoleType.ADMIN });
        const follower = toActor({ id: 20, role: RoleType.USER });

        expect(profilePolicy.decide(owner, target).allowed).toBe(true);
        expect(profilePolicy.decide(follower, target, { acceptedFollower: true }).allowed).toBe(true);
        expect(profilePolicy.decide(admin, target).allowed).toBe(true);
    });

    it("does not give managers an implicit private-profile bypass", () => {
        const manager = toActor({ id: 20, role: RoleType.MANAGER });

        expect(profilePolicy.decide(manager, profile(PrivacyType.PRIVATE))).toEqual({
            allowed: false,
            reason: DenialReason.PROFILE_PRIVATE,
        });
    });
});
