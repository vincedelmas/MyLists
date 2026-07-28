import {describe, expect, it} from "vitest";
import {DenialReason, PrivacyType, RoleType} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization/utils";
import {canViewPrivateProfileCollections, collectionPolicy} from "@/lib/server/authorization/policies/collection.policy";


const collection = (privacy: PrivacyType, ownerPrivacy: PrivacyType = PrivacyType.PUBLIC) => {
    return ({
        privacy,
        ownerId: 10,
        ownerPrivacy,
    });
}


describe("collectionPolicy", () => {
    it("lets public collections bypass owner profile privacy", () => {
        const subject = collection(PrivacyType.PUBLIC, PrivacyType.PRIVATE);
        expect(collectionPolicy.decide(toActor(), "read", subject).allowed).toBe(true);
    });

    it("requires authentication to like or copy visible collections", () => {
        const anonymous = toActor();
        const subject = collection(PrivacyType.PUBLIC);

        expect(collectionPolicy.decide(anonymous, "read", subject)).toEqual({ allowed: true });
        expect(collectionPolicy.decide(anonymous, "like", subject)).toEqual({ allowed: false, reason: DenialReason.AUTH_REQUIRED });
        expect(collectionPolicy.decide(anonymous, "copy", subject)).toEqual({ allowed: false, reason: DenialReason.AUTH_REQUIRED });
        expect(collectionPolicy.capabilities(anonymous, subject)).toMatchObject({ read: true, like: false, copy: false });
    });

    it("makes restricted collections inherit owner profile visibility", () => {
        const anonymous = toActor();
        const user = toActor({ id: 20, role: RoleType.USER });

        expect(collectionPolicy.decide(anonymous, "read", collection(PrivacyType.RESTRICTED, PrivacyType.PUBLIC)).allowed)
            .toBe(true);

        expect(collectionPolicy.decide(anonymous, "read", collection(PrivacyType.RESTRICTED, PrivacyType.RESTRICTED)).allowed)
            .toBe(false);
        expect(collectionPolicy.decide(anonymous, "read", collection(PrivacyType.RESTRICTED, PrivacyType.RESTRICTED)))
            .toEqual({ allowed: false, reason: DenialReason.PROFILE_RESTRICTED });

        expect(collectionPolicy.decide(user, "read", collection(PrivacyType.RESTRICTED, PrivacyType.RESTRICTED)).allowed)
            .toBe(true);

        expect(collectionPolicy.decide(user, "read", collection(PrivacyType.RESTRICTED, PrivacyType.PRIVATE), { acceptedFollower: true }).allowed)
            .toBe(true);
        expect(collectionPolicy.decide(user, "read", collection(PrivacyType.RESTRICTED, PrivacyType.PRIVATE)))
            .toEqual({ allowed: false, reason: DenialReason.PROFILE_PRIVATE });
    });

    it("keeps private collections owner-only for normal viewers", () => {
        const subject = collection(PrivacyType.PRIVATE);
        const user = toActor({ id: 20, role: RoleType.USER });
        const owner = toActor({ id: 10, role: RoleType.USER });

        expect(collectionPolicy.decide(owner, "read", subject).allowed).toBe(true);
        expect(collectionPolicy.decide(user, "read", subject).allowed).toBe(false);
    });

    it("grants managers moderation only over published collections", () => {
        const manager = toActor({ id: 20, role: RoleType.MANAGER });

        for (const privacy of [PrivacyType.PUBLIC, PrivacyType.RESTRICTED]) {
            const subject = collection(privacy, PrivacyType.PRIVATE);
            expect(collectionPolicy.decide(manager, "read", subject), privacy).toEqual({ allowed: true });
            expect(collectionPolicy.decide(manager, "edit", subject), privacy).toEqual({ allowed: true });
            expect(collectionPolicy.decide(manager, "delete", subject), privacy).toEqual({ allowed: true });
        }
    });

    it("does not let managers inspect or moderate private collections", () => {
        const subject = collection(PrivacyType.PRIVATE, PrivacyType.PRIVATE);
        const manager = toActor({ id: 20, role: RoleType.MANAGER });

        expect(collectionPolicy.decide(manager, "read", subject))
            .toEqual({ allowed: false, reason: DenialReason.RESOURCE_PRIVATE });
        expect(collectionPolicy.decide(manager, "edit", subject))
            .toEqual({ allowed: false, reason: DenialReason.INSUFFICIENT_ROLE });
        expect(collectionPolicy.decide(manager, "delete", subject))
            .toEqual({ allowed: false, reason: DenialReason.INSUFFICIENT_ROLE });
        expect(collectionPolicy.decide(manager, "like", subject))
            .toEqual({ allowed: false, reason: DenialReason.RESOURCE_PRIVATE });
        expect(collectionPolicy.decide(manager, "copy", subject))
            .toEqual({ allowed: false, reason: DenialReason.RESOURCE_PRIVATE });
    });

    it("lets admins inspect and moderate private collections without granting social interactions", () => {
        const subject = collection(PrivacyType.PRIVATE, PrivacyType.PRIVATE);
        const admin = toActor({ id: 30, role: RoleType.ADMIN });

        expect(collectionPolicy.decide(admin, "read", subject)).toEqual({ allowed: true });
        expect(collectionPolicy.decide(admin, "edit", subject)).toEqual({ allowed: true });
        expect(collectionPolicy.decide(admin, "delete", subject)).toEqual({ allowed: true });
        expect(collectionPolicy.decide(admin, "like", subject))
            .toEqual({ allowed: false, reason: DenialReason.RESOURCE_PRIVATE });
        expect(collectionPolicy.decide(admin, "copy", subject))
            .toEqual({ allowed: false, reason: DenialReason.RESOURCE_PRIVATE });
    });

    it("keeps item-level additions and removals owner-only", () => {
        const subject = collection(PrivacyType.PUBLIC);
        const owner = toActor({ id: 10, role: RoleType.USER });
        const manager = toActor({ id: 20, role: RoleType.MANAGER });

        expect(collectionPolicy.decide(owner, "addItem", subject).allowed).toBe(true);
        expect(collectionPolicy.decide(owner, "removeItem", subject).allowed).toBe(true);
        expect(collectionPolicy.decide(manager, "addItem", subject).allowed).toBe(false);
        expect(collectionPolicy.decide(manager, "removeItem", subject).allowed).toBe(false);
    });

    it("lets authenticated viewers interact with visible public collections", () => {
        const user = toActor({ id: 20, role: RoleType.USER });
        const subject = collection(PrivacyType.PUBLIC);

        expect(collectionPolicy.decide(user, "like", subject)).toEqual({ allowed: true });
        expect(collectionPolicy.decide(user, "copy", subject)).toEqual({ allowed: true });
    });

    it("uses authentication and role denial reasons for write actions", () => {
        const anonymous = toActor();
        const user = toActor({ id: 20, role: RoleType.USER });
        const subject = collection(PrivacyType.PUBLIC);

        expect(collectionPolicy.decide(anonymous, "edit", subject))
            .toEqual({ allowed: false, reason: DenialReason.AUTH_REQUIRED });
        expect(collectionPolicy.decide(user, "edit", subject))
            .toEqual({ allowed: false, reason: DenialReason.INSUFFICIENT_ROLE });
        expect(collectionPolicy.decide(anonymous, "addItem", subject))
            .toEqual({ allowed: false, reason: DenialReason.AUTH_REQUIRED });
        expect(collectionPolicy.decide(user, "addItem", subject))
            .toEqual({ allowed: false, reason: DenialReason.INSUFFICIENT_ROLE });
    });

    it("lets owners perform every collection action", () => {
        const owner = toActor({ id: 10, role: RoleType.USER });
        const subject = collection(PrivacyType.PRIVATE, PrivacyType.PRIVATE);

        for (const action of ["read", "edit", "delete", "addItem", "removeItem", "like", "copy"] as const) {
            expect(collectionPolicy.decide(owner, action, subject), action).toEqual({ allowed: true });
        }
    });

    it("shows private profile collections only to owners and admins", () => {
        const owner = toActor({ id: 10, role: RoleType.USER });
        const admin = toActor({ id: 30, role: RoleType.ADMIN });
        const manager = toActor({ id: 20, role: RoleType.MANAGER });

        expect(canViewPrivateProfileCollections(owner, 10)).toBe(true);
        expect(canViewPrivateProfileCollections(manager, 10)).toBe(false);
        expect(canViewPrivateProfileCollections(admin, 10)).toBe(true);
    });
});
