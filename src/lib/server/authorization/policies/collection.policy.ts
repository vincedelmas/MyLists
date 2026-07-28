import {DenialReason, PrivacyType, RoleType} from "@/lib/utils/enums";
import {AccessDecision, Actor, allow, deny, hasRequiredRole} from "@/lib/server/authorization/utils";


export type CollectionAction = "read" | "edit" | "delete" | "addItem" | "removeItem" | "like" | "copy";


type CollectionRelationship = {
    acceptedFollower: boolean;
};


export type CollectionSubject = {
    ownerId: number;
    privacy: PrivacyType;
    ownerPrivacy: PrivacyType;
};


const canModerate = (actor: Actor, collection: CollectionSubject) => {
    if (hasRequiredRole(actor, RoleType.ADMIN)) return true;
    return collection.privacy !== PrivacyType.PRIVATE && hasRequiredRole(actor, RoleType.MANAGER);
};


const isOwner = (actor: Actor, collection: CollectionSubject) => {
    return actor.kind === "user" && actor.id === collection.ownerId;
};


const decideCollectionAccess = (
    actor: Actor,
    action: CollectionAction,
    collection: CollectionSubject,
    relationship: CollectionRelationship = { acceptedFollower: false },
): AccessDecision => {
    if (action === "edit" || action === "delete") {
        return (isOwner(actor, collection) || canModerate(actor, collection))
            ? allow()
            : deny(actor.kind === "anonymous"
                ? DenialReason.AUTH_REQUIRED
                : DenialReason.INSUFFICIENT_ROLE);
    }

    if (action === "addItem" || action === "removeItem") {
        return isOwner(actor, collection)
            ? allow()
            : deny(actor.kind === "anonymous"
                ? DenialReason.AUTH_REQUIRED
                : DenialReason.INSUFFICIENT_ROLE);
    }

    if ((action === "like" || action === "copy") && actor.kind === "anonymous") {
        return deny(DenialReason.AUTH_REQUIRED);
    }

    // Admins can inspect every collection. Managers can moderate only collections
    // their owners chose to publish as public or restricted.
    if (action === "read" && canModerate(actor, collection)) return allow();

    if (isOwner(actor, collection)) return allow();

    if (collection.privacy === PrivacyType.PRIVATE) {
        return deny(DenialReason.RESOURCE_PRIVATE);
    }

    if (collection.privacy === PrivacyType.PUBLIC) return allow();

    // Restricted collections inherit visibility of owner's profile.
    if (collection.ownerPrivacy === PrivacyType.PUBLIC) return allow();

    if (actor.kind === "anonymous") {
        return collection.ownerPrivacy === PrivacyType.RESTRICTED
            ? deny(DenialReason.PROFILE_RESTRICTED)
            : deny(DenialReason.PROFILE_PRIVATE);
    }

    if (collection.ownerPrivacy === PrivacyType.RESTRICTED) return allow();
    if (relationship.acceptedFollower) return allow();

    return deny(DenialReason.PROFILE_PRIVATE);
};


const getCollectionCapabilities = (actor: Actor, collection: CollectionSubject, relationship: CollectionRelationship = { acceptedFollower: false }) => ({
    read: decideCollectionAccess(actor, "read", collection, relationship).allowed,
    edit: decideCollectionAccess(actor, "edit", collection, relationship).allowed,
    like: decideCollectionAccess(actor, "like", collection, relationship).allowed,
    copy: decideCollectionAccess(actor, "copy", collection, relationship).allowed,
    delete: decideCollectionAccess(actor, "delete", collection, relationship).allowed,
    addItem: decideCollectionAccess(actor, "addItem", collection, relationship).allowed,
    removeItem: decideCollectionAccess(actor, "removeItem", collection, relationship).allowed,
});


export const canViewPrivateProfileCollections = (actor: Actor, ownerId: number): boolean => {
    return (actor.kind === "user" && actor.id === ownerId) || hasRequiredRole(actor, RoleType.ADMIN);
};


export const collectionPolicy = {
    decide: decideCollectionAccess,
    capabilities: getCollectionCapabilities,
};
