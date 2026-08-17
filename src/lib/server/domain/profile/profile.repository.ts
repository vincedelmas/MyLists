import {alias} from "drizzle-orm/sqlite-core";
import {getDbClient} from "@/lib/server/database/async-storage";
import {ApiProviderType, MediaType, PrivacyType} from "@/lib/utils/enums";
import {HighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import {and, asc, count, eq, gte, isNotNull, like, sql, sum} from "drizzle-orm";
import {ProviderSearchResult, ProviderSearchResults} from "@/lib/types/provider.types";
import {followers, profileCustom, user, userMediaSettings} from "@/lib/server/database/schema";


export class ProfileRepository {
    static async getRandomPublicProfile() {
        const randomPublicProfile = getDbClient()
            .select({ name: user.name })
            .from(user)
            .innerJoin(userMediaSettings, eq(userMediaSettings.userId, user.id))
            .where(and(
                eq(user.emailVerified, true),
                eq(user.privacy, PrivacyType.PUBLIC),
                eq(userMediaSettings.active, true),
            ))
            .groupBy(user.id, user.name)
            .having(gte(sum(userMediaSettings.timeSpent), 5000))
            .orderBy(sql`random()`)
            .get();

        return randomPublicProfile ?? null;
    }

    static async incrementMediaTypeView(userId: number, mediaType: MediaType) {
        await getDbClient()
            .update(userMediaSettings)
            .set({ views: sql`${userMediaSettings.views} + 1` })
            .where(and(eq(userMediaSettings.userId, userId), eq(userMediaSettings.mediaType, mediaType)));
    }

    static async incrementProfileView(userId: number) {
        return getDbClient()
            .update(user)
            .set({ profileViews: sql`${user.profileViews} + 1` })
            .where(eq(user.id, userId));
    }

    static async searchUsers(query: string, page = 1, currentUserId?: number): Promise<ProviderSearchResults> {
        const currentUserFollows = alias(followers, "search_current_user_follows");

        const usersCount = getDbClient()
            .select({ count: count() })
            .from(user)
            .where(like(user.name, `%${query}%`))
            .get()?.count ?? 0;

        const dbUsers = await getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                date: user.createdAt,
                privacy: user.privacy,
                followStatus: currentUserFollows.status,
            })
            .from(user)
            .leftJoin(currentUserFollows, and(
                eq(currentUserFollows.followedId, user.id),
                eq(currentUserFollows.followerId, currentUserId ?? -1),
            ))
            .where(like(user.name, `%${query}%`))
            .orderBy(asc(user.name))
            .limit(20)
            .offset((page - 1) * 20);

        const users = dbUsers.map((profile) => ({
            ...profile,
            itemType: ApiProviderType.USERS,
        }) as ProviderSearchResult);

        return { data: users, hasNextPage: usersCount > page * 20 };
    }

    static async getProfileImageFilenames() {
        return getDbClient()
            .select({ image: user.image })
            .from(user)
            .where(isNotNull(user.image));
    }

    static async getBackgroundImageFilenames() {
        return getDbClient()
            .select({ backgroundImage: user.backgroundImage })
            .from(user)
            .where(isNotNull(user.backgroundImage));
    }

    static async getActiveMediaTypes(userId: number) {
        return getDbClient()
            .select({ mediaType: userMediaSettings.mediaType })
            .from(userMediaSettings)
            .where(and(eq(userMediaSettings.userId, userId), eq(userMediaSettings.active, true)))
            .then((rows) => rows.map((row) => row.mediaType));
    }

    static async getHighlightedMediaSettings(userId: number) {
        const settings = getDbClient()
            .select()
            .from(profileCustom)
            .where(and(eq(profileCustom.userId, userId), eq(profileCustom.key, "highlightedMedia")))
            .get();

        return settings?.value as HighlightedMediaSettings | undefined;
    }

    static async upsertHighlightedMediaSettings(userId: number, value: HighlightedMediaSettings) {
        await getDbClient()
            .insert(profileCustom)
            .values({ userId, key: "highlightedMedia", value })
            .onConflictDoUpdate({
                target: [profileCustom.userId, profileCustom.key],
                set: {
                    value,
                    updatedAt: sql`datetime('now')`,
                },
            });
    }
}
