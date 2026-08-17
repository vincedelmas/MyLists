import {alias} from "drizzle-orm/sqlite-core";
import {and, asc, eq, sql} from "drizzle-orm";
import {SocialState} from "@/lib/utils/enums";
import {followers, user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";


export class SocialRepository {
    static async follow(followerId: number, followedId: number, status: SocialState) {
        await getDbClient()
            .insert(followers)
            .values({ followerId, followedId, status })
            .onConflictDoNothing();
    }

    static async unfollow(followerId: number, followedId: number) {
        await getDbClient()
            .delete(followers)
            .where(and(eq(followers.followerId, followerId), eq(followers.followedId, followedId)));
    }

    static async acceptFollowRequest(followerId: number, followedId: number) {
        return getDbClient()
            .update(followers)
            .set({ status: SocialState.ACCEPTED })
            .where(and(
                eq(followers.followerId, followerId),
                eq(followers.followedId, followedId),
                eq(followers.status, SocialState.REQUESTED),
            ))
            .returning({ id: followers.followerId });
    }

    static async declineFollowRequest(followerId: number, followedId: number) {
        return getDbClient()
            .delete(followers)
            .where(and(
                eq(followers.followerId, followerId),
                eq(followers.followedId, followedId),
                eq(followers.status, SocialState.REQUESTED),
            ))
            .returning({ id: followers.followerId });
    }

    static async getUserFollowers(currentUserId: number | undefined, userId: number, limit = 8) {
        const currentUserFollows = alias(followers, "currentUserFollows");
        const followersUsers = await getDbClient()
            .select({
                id: user.id,
                image: user.image,
                username: user.name,
                privacy: user.privacy,
                myFollowStatus: sql<SocialState | null>`
                    CASE
                        WHEN ${currentUserFollows.followerId} IS NOT NULL THEN ${currentUserFollows.status}
                        ELSE NULL
                    END
                `,
            })
            .from(followers)
            .innerJoin(user, eq(followers.followerId, user.id))
            .leftJoin(currentUserFollows, and(
                eq(currentUserFollows.followedId, user.id),
                eq(currentUserFollows.followerId, currentUserId ?? -1),
            ))
            .where(and(eq(followers.followedId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .orderBy(asc(user.name))
            .limit(limit);

        return { followers: followersUsers };
    }

    static async getUserFollows(currentUserId: number | undefined, userId: number, limit = 8) {
        const currentUserFollows = alias(followers, "currentUserFollows");
        const followedUsers = await getDbClient()
            .select({
                id: user.id,
                image: user.image,
                username: user.name,
                privacy: user.privacy,
                myFollowStatus: sql<SocialState | null>`
                    CASE
                        WHEN ${currentUserFollows.followerId} IS NOT NULL THEN ${currentUserFollows.status}
                        ELSE NULL
                    END
                `,
            })
            .from(followers)
            .innerJoin(user, eq(followers.followedId, user.id))
            .leftJoin(currentUserFollows, and(
                eq(currentUserFollows.followedId, user.id),
                eq(currentUserFollows.followerId, currentUserId ?? -1),
            ))
            .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .orderBy(asc(user.name))
            .limit(limit);

        return { follows: followedUsers };
    }

    static async getFollowCount(userId: number) {
        const followsCount = getDbClient()
            .select({ value: sql<number>`count()` })
            .from(followers)
            .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .get()?.value ?? 0;
        const followersCount = getDbClient()
            .select({ value: sql<number>`count()` })
            .from(followers)
            .where(and(eq(followers.followedId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .get()?.value ?? 0;

        return { followersCount, followsCount };
    }

    static async getFollowingStatus(userId: number, followedId: number) {
        return getDbClient()
            .select()
            .from(followers)
            .where(and(eq(followers.followerId, userId), eq(followers.followedId, followedId)))
            .get();
    }
}
