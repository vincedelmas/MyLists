import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";


export type LibraryActor = {
    id: number;
    role: RoleType;
};

type LibraryAccessReason = "owner" | "administrator" | "public" | "member" | "follower";

export type LibraryAccessScope = {
    actorId?: number;
    ownerId: number;
    reason: LibraryAccessReason;
};

export type LibraryAccessDecision =
    | { allowed: true; scope: LibraryAccessScope }
    | { allowed: false; reason: "authentication_required" | "follow_required" };

type MediaListAccessDeniedReason =
    | Extract<LibraryAccessDecision, { allowed: false }>["reason"]
    | "media_type_disabled";


interface DecideLibraryAccessParams {
    actor?: LibraryActor | null;
    followState?: SocialState | null;
    owner: {
        id: number;
        privacy: PrivacyType;
    };
}


/**
 * Resolves access to a user's private library-derived surfaces. Public profile
 * headers and collections deliberately do not use this policy.
 */
export const decideLibraryAccess = ({ actor, owner, followState }: DecideLibraryAccessParams): LibraryAccessDecision => {
    if (actor?.id === owner.id) {
        return {
            allowed: true,
            scope: {
                reason: "owner",
                actorId: actor.id,
                ownerId: owner.id,
            }
        };
    }

    if (actor?.role === RoleType.ADMIN) {
        return {
            allowed: true,
            scope: {
                actorId: actor.id,
                ownerId: owner.id,
                reason: "administrator",
            }
        };
    }

    if (owner.privacy === PrivacyType.PUBLIC) {
        return {
            allowed: true,
            scope: {
                reason: "public",
                ownerId: owner.id,
                actorId: actor?.id,
            }
        };
    }

    if (!actor) {
        return {
            allowed: false,
            reason: "authentication_required",
        };
    }

    if (owner.privacy === PrivacyType.RESTRICTED) {
        return {
            allowed: true,
            scope: {
                reason: "member",
                actorId: actor.id,
                ownerId: owner.id,
            }
        };
    }

    if (followState === SocialState.ACCEPTED) {
        return {
            allowed: true,
            scope: {
                actorId: actor.id,
                ownerId: owner.id,
                reason: "follower"
            }
        };
    }

    return { allowed: false, reason: "follow_required" };
};


export type MediaListAccessScope = LibraryAccessScope & { mediaTypeEnabled: true };


export type MediaListAccessDecision =
    | { allowed: true; scope: MediaListAccessScope }
    | { allowed: false; reason: MediaListAccessDeniedReason };


/** A media list is visible only when both its library audience and channel allow it. */
export const decideMediaListAccess = (
    libraryDecision: LibraryAccessDecision,
    mediaTypeEnabled: boolean,
): MediaListAccessDecision => {
    if (!libraryDecision.allowed) return libraryDecision;
    if (!mediaTypeEnabled) return { allowed: false, reason: "media_type_disabled" };

    return {
        allowed: true,
        scope: { ...libraryDecision.scope, mediaTypeEnabled: true },
    };
};
