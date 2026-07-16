import {alias} from "drizzle-orm/sqlite-core";
import {SocialState} from "@/lib/utils/enums";
import {and, asc, count, eq, sql} from "drizzle-orm";
import {followers, user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";


export class SocialGraphRepository {
    async createRelationship(followerId: number, followedId: number, status: SocialState) {
        const rows = await getDbClient().insert(followers)
            .values({ followerId, followedId, status })
            .onConflictDoNothing()
            .returning();
        return rows[0];
    }

    async deleteRelationship(followerId: number, followedId: number) {
        const rows = await getDbClient().delete(followers).where(and(
            eq(followers.followerId, followerId),
            eq(followers.followedId, followedId),
        )).returning();
        return rows[0];
    }

    async acceptRequest(followerId: number, followedId: number) {
        const rows = await getDbClient().update(followers)
            .set({ status: SocialState.ACCEPTED })
            .where(and(
                eq(followers.followerId, followerId),
                eq(followers.followedId, followedId),
                eq(followers.status, SocialState.REQUESTED),
            )).returning();
        return rows[0];
    }

    async declineRequest(followerId: number, followedId: number) {
        const rows = await getDbClient().delete(followers).where(and(
            eq(followers.followerId, followerId),
            eq(followers.followedId, followedId),
            eq(followers.status, SocialState.REQUESTED),
        )).returning();
        return rows[0];
    }

    getFollowingStatus(followerId: number, followedId: number) {
        return getDbClient()
            .select()
            .from(followers)
            .where(and(eq(followers.followerId, followerId), eq(followers.followedId, followedId)))
            .get();
    }

    getCounts(userId: number) {
        const followsCount = getDbClient()
            .select({ value: count() })
            .from(followers)
            .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .get()?.value ?? 0;

        const followersCount = getDbClient()
            .select({ value: count() })
            .from(followers)
            .where(and(eq(followers.followedId, userId), eq(followers.status, SocialState.ACCEPTED)))
            .get()?.value ?? 0;

        return { followersCount, followsCount };
    }

    async getFollowers(viewerId: number | undefined, ownerId: number, limit = 8) {
        const viewerRelationships = alias(followers, "viewerFollowerRelationships");

        const rows = await getDbClient().select({
            id: user.id,
            image: user.image,
            username: user.name,
            privacy: user.privacy,
            myFollowStatus: sql<SocialState | null>`CASE
                WHEN ${viewerRelationships.followerId} IS NOT NULL THEN ${viewerRelationships.status}
                ELSE NULL
            END`,
        }).from(followers)
            .innerJoin(user, eq(followers.followerId, user.id))
            .leftJoin(viewerRelationships, and(
                eq(viewerRelationships.followedId, user.id),
                eq(viewerRelationships.followerId, viewerId ?? -1),
            ))
            .where(and(
                eq(followers.followedId, ownerId),
                eq(followers.status, SocialState.ACCEPTED),
            ))
            .orderBy(asc(user.name))
            .limit(limit);

        return { followers: rows };
    }

    async getFollows(viewerId: number | undefined, ownerId: number, limit = 8) {
        const viewerRelationships = alias(followers, "viewerFollowedRelationships");

        const rows = await getDbClient()
            .select({
                id: user.id,
                image: user.image,
                username: user.name,
                privacy: user.privacy,
                myFollowStatus: sql<SocialState | null>`CASE
                WHEN ${viewerRelationships.followerId} IS NOT NULL THEN ${viewerRelationships.status}
                    ELSE NULL
                END`,
            }).from(followers)
            .innerJoin(user, eq(followers.followedId, user.id))
            .leftJoin(viewerRelationships, and(
                eq(viewerRelationships.followedId, user.id),
                eq(viewerRelationships.followerId, viewerId ?? -1),
            ))
            .where(and(eq(followers.followerId, ownerId), eq(followers.status, SocialState.ACCEPTED)))
            .orderBy(asc(user.name))
            .limit(limit);

        return { follows: rows };
    }
}
