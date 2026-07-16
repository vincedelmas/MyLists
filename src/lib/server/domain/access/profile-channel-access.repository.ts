import {and, eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {profileMediaChannel} from "@/lib/server/database/schema";


/** Canonical publication switches used by authorization, never list contents or collections. */
export class ProfileChannelAccessRepository {
    async updateSettings(userId: number, payload: Partial<Record<MediaType, boolean>>) {
        const rows = Object.entries(payload)
            .filter((entry): entry is [MediaType, boolean] => typeof entry[1] === "boolean");
        for (const [kind, enabled] of rows) {
            await getDbClient().insert(profileMediaChannel).values({ userId, kind, enabled })
                .onConflictDoUpdate({
                    target: [profileMediaChannel.userId, profileMediaChannel.kind],
                    set: { enabled },
                });
        }
        return getDbClient().select({
            mediaType: profileMediaChannel.kind,
            active: profileMediaChannel.enabled,
            views: profileMediaChannel.views,
        }).from(profileMediaChannel).where(eq(profileMediaChannel.userId, userId));
    }

    incrementView(userId: number, kind: MediaType) {
        return getDbClient().update(profileMediaChannel)
            .set({ views: sql`${profileMediaChannel.views} + 1` })
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, kind)))
            .returning({
                mediaType: profileMediaChannel.kind,
                active: profileMediaChannel.enabled,
                views: profileMediaChannel.views,
            }).get();
    }

    async isEnabled(userId: number, kind: MediaType) {
        const channel = await getDbClient().select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, kind)))
            .get();
        return channel?.enabled === true;
    }

    async getEnabledKinds(userId: number) {
        const rows = await getDbClient().select({ kind: profileMediaChannel.kind })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.enabled, true)));
        const enabled = new Set(rows.map(({ kind }) => kind));
        return Object.values(MediaType).filter((kind) => enabled.has(kind));
    }
}
