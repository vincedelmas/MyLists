import {NotifTab} from "@/lib/types/notifications.types";
import {and, desc, eq, inArray, ne, sql} from "drizzle-orm";
import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {mediaNotifications, socialNotifications} from "@/lib/server/database/schema";


export class NotificationsRepository {

    // --- Social Notifications ---------------------------

    static createSocialNotification(data: typeof socialNotifications.$inferInsert) {
        if (data.featureRequestId) {
            getDbClient()
                .delete(socialNotifications)
                .where(and(
                    eq(socialNotifications.type, data.type),
                    eq(socialNotifications.userId, data.userId),
                    eq(socialNotifications.actorId, data.actorId),
                    eq(socialNotifications.featureRequestId, data.featureRequestId),
                )).run();
        }

        getDbClient()
            .insert(socialNotifications)
            .values(data)
            .onConflictDoNothing().run();
    }

    static deleteSocialNotifsBetweenUsers(recipientId: number, actorId: number, types: SocialNotifType[]) {
        getDbClient()
            .delete(socialNotifications)
            .where(and(
                eq(socialNotifications.userId, recipientId),
                eq(socialNotifications.actorId, actorId),
                inArray(socialNotifications.type, types),
            )).run();
    }

    static async deleteSocialNotif(userId: number, notificationId: number) {
        await getDbClient()
            .delete(socialNotifications)
            .where(and(
                eq(socialNotifications.userId, userId),
                eq(socialNotifications.id, notificationId),
                ne(socialNotifications.type, SocialNotifType.FOLLOW_REQUESTED),
            ));
    }

    // --- Media Notifications ---------------------------

    static createMediaNotification(data: typeof mediaNotifications.$inferInsert) {
        getDbClient()
            .insert(mediaNotifications)
            .values(data)
            .run();
    }

    static searchMediaNotification(userId: number, mediaType: MediaType, mediaId: number) {
        return getDbClient()
            .select()
            .from(mediaNotifications)
            .where(and(
                eq(mediaNotifications.userId, userId),
                eq(mediaNotifications.mediaId, mediaId),
                eq(mediaNotifications.mediaType, mediaType),
            ))
            .orderBy(desc(mediaNotifications.createdAt), desc(mediaNotifications.id))
            .get();
    }

    static deleteMediaNotifications(mediaType: MediaType, mediaIds: number[]) {
        getDbClient()
            .delete(mediaNotifications)
            .where(and(eq(mediaNotifications.mediaType, mediaType), inArray(mediaNotifications.mediaId, mediaIds))).run();
    }

    static deleteUserMediaNotifications(userId: number, mediaType: MediaType, mediaId: number) {
        getDbClient()
            .delete(mediaNotifications)
            .where(and(
                eq(mediaNotifications.userId, userId),
                eq(mediaNotifications.mediaId, mediaId),
                eq(mediaNotifications.mediaType, mediaType),
            )).run();
    }

    // --- Both notifications ---------------------------

    static async getLastNotifications(userId: number, type: NotifTab, limit = 8) {
        if (type === "social") {
            return getDbClient().query.socialNotifications.findMany({
                where: eq(socialNotifications.userId, userId),
                with: {
                    featureRequest: { columns: { id: true, title: true } },
                    actor: { columns: { id: true, name: true, image: true } },
                },
                orderBy: desc(socialNotifications.createdAt),
                limit,
            });
        }

        return getDbClient().query.mediaNotifications.findMany({
            where: eq(mediaNotifications.userId, userId),
            orderBy: desc(mediaNotifications.createdAt),
            limit,
        });
    }

    static async countUnreadNotifications(userId: number) {
        const [social, media] = await Promise.all([
            getDbClient()
                .select({ count: sql<number>`count(*)` })
                .from(socialNotifications)
                .where(and(eq(socialNotifications.userId, userId), eq(socialNotifications.read, false))),

            getDbClient()
                .select({ count: sql<number>`count(*)` })
                .from(mediaNotifications)
                .where(and(eq(mediaNotifications.userId, userId), eq(mediaNotifications.read, false))),
        ]);

        return {
            media: media[0]?.count ?? 0,
            social: social[0]?.count ?? 0,
            total: (social[0]?.count ?? 0) + (media[0]?.count ?? 0),
        };
    }

    static async markAllAsRead(userId: number, type: NotifTab) {
        const table = type === "social" ? socialNotifications : mediaNotifications;

        await getDbClient()
            .update(table)
            .set({ read: true })
            .where(and(eq(table.userId, userId), eq(table.read, false)));
    }
}
