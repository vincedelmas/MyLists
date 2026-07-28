import {and, eq, inArray, or, sql} from "drizzle-orm";
import {followers, user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {Actor, hasRequiredRole} from "@/lib/server/authorization/utils";


const actorAwareProfileVisibilityCondition = (actor: Actor) => {
    if (actor.kind === "anonymous") return eq(user.privacy, PrivacyType.PUBLIC);
    if (hasRequiredRole(actor, RoleType.ADMIN)) return sql<boolean>`1 = 1`;

    const followedByVisitor = getDbClient()
        .select({ id: followers.followedId })
        .from(followers)
        .where(and(eq(followers.followerId, actor.id), eq(followers.status, SocialState.ACCEPTED)));

    return or(
        eq(user.privacy, PrivacyType.PUBLIC),
        eq(user.privacy, PrivacyType.RESTRICTED),
        eq(user.id, actor.id),
        and(eq(user.privacy, PrivacyType.PRIVATE), inArray(user.id, followedByVisitor)),
    );
};


export const communityProfileVisibilityCondition = actorAwareProfileVisibilityCondition;


export const followFeedProfileVisibilityCondition = actorAwareProfileVisibilityCondition;
