import {and, eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {HighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import {profileCustom, userMediaSettings} from "@/lib/server/database/schema";


export class UserProfileRepository {
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

    static async getBiography(userId: number) {
        const biography = getDbClient()
            .select({ value: profileCustom.value })
            .from(profileCustom)
            .where(and(eq(profileCustom.userId, userId), eq(profileCustom.key, "biography")))
            .get();

        return biography?.value as string | undefined;
    }

    static async upsertBiography(userId: number, value: string) {
        await getDbClient()
            .insert(profileCustom)
            .values({ userId, key: "biography", value })
            .onConflictDoUpdate({
                target: [profileCustom.userId, profileCustom.key],
                set: {
                    value,
                    updatedAt: sql`datetime('now')`,
                },
            });
    }

    static async deleteBiography(userId: number) {
        await getDbClient()
            .delete(profileCustom)
            .where(and(eq(profileCustom.userId, userId), eq(profileCustom.key, "biography")));
    }
}
