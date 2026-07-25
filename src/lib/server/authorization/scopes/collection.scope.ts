import {inArray} from "drizzle-orm";
import {PrivacyType} from "@/lib/utils/enums";
import {Actor} from "@/lib/server/authorization/utils";
import {collections} from "@/lib/server/database/schema";
import {canViewPrivateProfileCollections} from "@/lib/server/authorization/policies/collection.policy";


export const profileCollectionVisibilityCondition = (actor: Actor, ownerId: number) => {
    return canViewPrivateProfileCollections(actor, ownerId)
        ? undefined
        : inArray(collections.privacy, [PrivacyType.PUBLIC, PrivacyType.RESTRICTED]);
};
