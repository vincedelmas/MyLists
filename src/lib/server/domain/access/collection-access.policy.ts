import {isAtLeastRole, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";


export type CollectionAccessResource = {
    ownerId: number;
    ownerPrivacy: PrivacyType;
    visibility: PrivacyType;
};


export type CollectionAccessActor = {
    id?: number;
    role?: RoleType | null;
    followingStatus?: SocialState | null;
};


export type CollectionAccessDecision =
    | { allowed: true; reason: "owner" | "moderator" | "public" | "profile-public" | "authenticated" | "accepted-follower" }
    | { allowed: false; reason: "private" | "restricted" };


/** Collection visibility is independent from every personal media-list channel. */
export const decideCollectionAccess = (
    resource: CollectionAccessResource,
    actor: CollectionAccessActor,
    mode: "read" | "manage" = "read",
): CollectionAccessDecision => {
    if (actor.id === resource.ownerId) return { allowed: true, reason: "owner" };
    if (isAtLeastRole(actor.role, RoleType.MANAGER)) return { allowed: true, reason: "moderator" };
    if (mode === "manage") return { allowed: false, reason: "private" };

    if (resource.visibility === PrivacyType.PUBLIC) return { allowed: true, reason: "public" };
    if (resource.visibility === PrivacyType.PRIVATE) return { allowed: false, reason: "private" };

    if (resource.ownerPrivacy === PrivacyType.PUBLIC) return { allowed: true, reason: "profile-public" };
    if (!actor.id) {
        return { allowed: false, reason: resource.ownerPrivacy === PrivacyType.RESTRICTED ? "restricted" : "private" };
    }
    if (resource.ownerPrivacy === PrivacyType.RESTRICTED) return { allowed: true, reason: "authenticated" };
    return actor.followingStatus === SocialState.ACCEPTED
        ? { allowed: true, reason: "accepted-follower" }
        : { allowed: false, reason: "private" };
};
