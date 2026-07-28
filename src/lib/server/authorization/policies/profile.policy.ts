import {AccessDecision, Actor, allow, deny} from "@/lib/server/authorization/utils";
import {DenialReason, PrivacyType, RoleType} from "@/lib/utils/enums";


export type ProfileSubject = {
    id: number;
    privacy: PrivacyType;
};


export type ProfileRelationship = {
    acceptedFollower: boolean;
};


export const profilePolicy = {
    decide(actor: Actor, profile: ProfileSubject, relationship: ProfileRelationship = { acceptedFollower: false }): AccessDecision {
        if (profile.privacy === PrivacyType.PUBLIC) return allow();

        if (actor.kind === "anonymous") {
            return profile.privacy === PrivacyType.RESTRICTED
                ? deny(DenialReason.PROFILE_RESTRICTED)
                : deny(DenialReason.PROFILE_PRIVATE);
        }

        if (actor.id === profile.id || actor.role === RoleType.ADMIN) return allow();
        if (profile.privacy === PrivacyType.RESTRICTED) return allow();
        if (relationship.acceptedFollower) return allow();

        return deny(DenialReason.PROFILE_PRIVATE);
    },
};
