import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {NotifTab} from "@/lib/types/notifications.types";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


/** Notification mutation workflows, including upcoming-media deduplication. */
export class NotificationCommands {
    constructor(private readonly repository: typeof NotificationsRepository) {}

    deleteSocialNotifsBetweenUsers(recipientId: number, actorId: number, types: SocialNotifType[]) {
        return this.repository.deleteSocialNotifsBetweenUsers(recipientId, actorId, types);
    }

    createSocialNotification(data: { userId: number; actorId: number; type: SocialNotifType; featureRequestId?: number | null }) {
        return this.repository.createSocialNotification(data);
    }

    deleteSocialNotif(userId: number, notificationId: number) {
        return this.repository.deleteSocialNotif(userId, notificationId);
    }

    deleteMediaNotifications(mediaType: MediaType, mediaIds: number[]) {
        return this.repository.deleteMediaNotifications(mediaType, mediaIds);
    }

    deleteUserMediaNotifications(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.deleteUserMediaNotifications(userId, mediaType, mediaId);
    }

    markAllAsRead(userId: number, type: NotifTab) {
        return this.repository.markAllAsRead(userId, type);
    }
}
