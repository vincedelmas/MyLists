import * as z from "zod";
import {and, asc, count, eq, or, sql} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {notFound} from "@tanstack/react-router";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {mobileImagePath} from "@/lib/server/mobile/images";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {followers, user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";


export const socialListSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    kind: z.enum(["followers", "following", "requests", "pending"]).default("followers"),
});


export const socialActionSchema = z.object({
    targetId: z.number().int().positive(),
    action: z.enum(["follow", "unfollow", "remove", "accept", "decline"]),
});


export const getMobileSocial = async (
    userId: number,
    { kind, page }: z.infer<typeof socialListSchema>,
    viewerId = userId,
) => {
    if (viewerId !== userId && (kind === "requests" || kind === "pending")) throw new UnauthorizedError("private");
    const myFollowing = alias(followers, "myFollowing");
    const outgoing = kind === "following" || kind === "pending";

    const items = await getDbClient()
        .select({
            id: user.id,
            image: user.image,
            username: user.name,
            privacy: user.privacy,
            myFollowStatus: myFollowing.status,
        })
        .from(followers)
        .innerJoin(user, eq(outgoing ? followers.followedId : followers.followerId, user.id))
        .leftJoin(myFollowing, and(eq(myFollowing.followerId, viewerId), eq(myFollowing.followedId, user.id)))
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

    const isOutgoing = sql<number>`CASE WHEN ${followers.followerId} = ${userId} THEN 1 ELSE 0 END`;
    const totals = await getDbClient()
        .select({
            outgoing: isOutgoing,
            status: followers.status,
            total: count(),
        })
        .from(followers)
        .where(or(eq(followers.followerId, userId), eq(followers.followedId, userId)))
        .groupBy(isOutgoing, followers.status);
    const counts = {
        followers: 0,
        following: 0,
        requests: 0,
        pending: 0
    };
    for (const row of totals) {
        const outgoing = Boolean(row.outgoing);
        const key =
            row.status === SocialState.ACCEPTED
                ? outgoing
                    ? "following"
                    : "followers"
                : outgoing
                    ? "pending"
                    : "requests";
        counts[key] += row.total;
    }

    return {
        counts:
            viewerId === userId
                ? counts
                : {
                    followers: counts.followers,
                    following: counts.following,
                    requests: undefined,
                    pending: undefined
                },
        page,
        hasMore: items.length > 30,
        items: items.slice(0, 30).map((item) => ({
            ...item,
            isOwn: item.id === viewerId,
            image: item.image ? mobileImagePath(item.image) : null,
        })),
    };
};


export const actOnMobileSocial = async (userId: number, { targetId, action }: z.infer<typeof socialActionSchema>) => {
    const { services } = await getContainer();

    if (userId === targetId) {
        throw new FormattedError("You cannot follow yourself.");
    }

    if (action === "follow") {
        const target = await services.account.getUserById(targetId);
        if (!target) throw notFound();

        if (!services.social.getFollowingStatus(userId, targetId))
            services.social.follow(userId, targetId, target.privacy === PrivacyType.PRIVATE);
    }
    else if (action === "unfollow") {
        services.social.unfollow(userId, targetId);
    }
    else if (action === "remove") {
        services.social.removeFollower(targetId, userId);
    }
    else if (action === "accept") {
        services.social.acceptFollowRequest(targetId, userId);
    }
    else {
        services.social.declineFollowRequest(targetId, userId);
    }

    return { kind: "saved" as const };
};
