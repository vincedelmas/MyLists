import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {UserService} from "@/lib/server/domain/user/user.service";
import {AccessDecision, Actor} from "@/lib/server/authorization/utils";
import {profilePolicy, ProfileSubject} from "@/lib/server/authorization/policies/profile.policy";
import {CollectionAction, collectionPolicy, CollectionSubject} from "@/lib/server/authorization/policies/collection.policy";


export class AuthorizationService {
    constructor(private userService: UserService) {
    }

    async decideProfile(actor: Actor, profile: ProfileSubject): Promise<AccessDecision> {
        if (actor.kind === "user" && actor.id !== profile.id && profile.privacy === PrivacyType.PRIVATE) {
            const followStatus = await this.userService.getFollowingStatus(actor.id, profile.id);
            return profilePolicy.decide(actor, profile, { acceptedFollower: followStatus?.status === SocialState.ACCEPTED });
        }

        return profilePolicy.decide(actor, profile);
    }

    async decideCollection(actor: Actor, action: CollectionAction, collection: CollectionSubject): Promise<AccessDecision> {
        const needsFollowerRelationship = (
            actor.kind === "user"
            && actor.id !== collection.ownerId
            && collection.privacy === PrivacyType.RESTRICTED
            && collection.ownerPrivacy === PrivacyType.PRIVATE
            && (action === "read" || action === "like" || action === "copy")
        );

        if (needsFollowerRelationship) {
            const followStatus = await this.userService.getFollowingStatus(actor.id, collection.ownerId);
            return collectionPolicy.decide(actor, action, collection, { acceptedFollower: followStatus?.status === SocialState.ACCEPTED });
        }

        return collectionPolicy.decide(actor, action, collection);
    }

    async getCollectionCapabilities(actor: Actor, collection: CollectionSubject) {
        const needsFollowerRelationship = (
            actor.kind === "user"
            && actor.id !== collection.ownerId
            && collection.privacy === PrivacyType.RESTRICTED
            && collection.ownerPrivacy === PrivacyType.PRIVATE
        );

        if (!needsFollowerRelationship) {
            return collectionPolicy.capabilities(actor, collection);
        }

        const followStatus = await this.userService.getFollowingStatus(actor.id, collection.ownerId);

        return collectionPolicy.capabilities(actor, collection, { acceptedFollower: followStatus?.status === SocialState.ACCEPTED });
    }
}
