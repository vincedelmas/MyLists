import * as z from "zod";
import {and, asc, eq} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {notFound} from "@tanstack/react-router";
import {getDbClient} from "@/lib/server/database/async-storage";
import {followers, user} from "@/lib/server/database/schema";
import {getContainer} from "@/lib/server/core/container";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {mobileImagePath} from "./images";

export const socialListSchema = z.object({
    kind: z.enum(["followers", "following", "requests", "pending"]).default("followers"),
    page: z.coerce.number().int().min(1).default(1),
});
export const socialActionSchema = z.object({
    targetId: z.number().int().positive(),
    action: z.enum(["follow", "unfollow", "remove", "accept", "decline"]),
});

export const getMobileSocial = async (userId: number, {kind, page}: z.infer<typeof socialListSchema>) => {
    const outgoing = kind === "following" || kind === "pending";
    const myFollowing = alias(followers, "myFollowing");
    const items = await getDbClient()
        .select({
            id: user.id,
            username: user.name,
            image: user.image,
            privacy: user.privacy,
            myFollowStatus: myFollowing.status,
        })
        .from(followers)
        .innerJoin(user, eq(outgoing ? followers.followedId : followers.followerId, user.id))
        .leftJoin(myFollowing, and(eq(myFollowing.followerId, userId), eq(myFollowing.followedId, user.id)))
        .where(
            and(
                eq(outgoing ? followers.followerId : followers.followedId, userId),
                eq(
                    followers.status,
                    kind === "requests" || kind === "pending" ? SocialState.REQUESTED : SocialState.ACCEPTED,
                ),
            ),
        )
        .orderBy(asc(user.name), asc(user.id))
        .limit(31)
        .offset((page - 1) * 30);
    return {
        page,
        hasMore: items.length > 30,
        items: items.slice(0, 30).map((item) => ({...item, image: item.image ? mobileImagePath(item.image) : null})),
    };
};

export const actOnMobileSocial = async (userId: number, {targetId, action}: z.infer<typeof socialActionSchema>) => {
    if (userId === targetId) throw new FormattedError("You cannot follow yourself.");
    const {services} = await getContainer();
    if (action === "follow") {
        const target = await services.account.getUserById(targetId);
        if (!target) throw notFound();
        // Existing requests and accepted relationships are idempotent, including notifications.
        if (!services.social.getFollowingStatus(userId, targetId))
            services.social.follow(userId, targetId, target.privacy === PrivacyType.PRIVATE);
    } else if (action === "unfollow") services.social.unfollow(userId, targetId);
    else if (action === "remove") services.social.removeFollower(targetId, userId);
    else if (action === "accept") services.social.acceptFollowRequest(targetId, userId);
    else services.social.declineFollowRequest(targetId, userId);
    return {kind: "saved" as const};
};
