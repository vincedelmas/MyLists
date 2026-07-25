import {and, eq, inArray, or} from "drizzle-orm";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {followers, user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";


export const communityProfileVisibilityCondition = (authenticated: boolean) => {
    return authenticated
        ? inArray(user.privacy, [PrivacyType.PUBLIC, PrivacyType.RESTRICTED])
        : eq(user.privacy, PrivacyType.PUBLIC);
};


export const followFeedProfileVisibilityCondition = (visitorId?: number) => {
    if (!visitorId) return eq(user.privacy, PrivacyType.PUBLIC);

    const followedByVisitor = getDbClient()
        .select({ id: followers.followedId })
        .from(followers)
        .where(and(
            eq(followers.followerId, visitorId),
            eq(followers.status, SocialState.ACCEPTED),
        ));

    return or(
        eq(user.privacy, PrivacyType.PUBLIC),
        eq(user.privacy, PrivacyType.RESTRICTED),
        eq(user.id, visitorId),
        and(
            eq(user.privacy, PrivacyType.PRIVATE),
            inArray(user.id, followedByVisitor),
        ),
    );
};
