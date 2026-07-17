import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {compareCalendarDates} from "@/lib/utils/date-formatting";
import {NotifTab, UpComingMedia} from "@/lib/types/notifications.types";
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

    async createMediaNotifications(mediaType: MediaType, mediaArray: UpComingMedia[]) {
        for (const item of mediaArray) {
            const notification = await this.repository.searchMediaNotification(item.userId, mediaType, item.mediaId);

            if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
                if (
                    notification
                    && compareCalendarDates(notification.releaseDate, item.date) === 0
                    && notification.episode === item.episodeToAir
                    && notification.season === item.seasonToAir
                ) {
                    continue;
                }

                await this.repository.createMediaNotification({
                    userId: item.userId,
                    name: item.mediaName,
                    mediaType,
                    mediaId: item.mediaId,
                    releaseDate: item.date,
                    season: item.seasonToAir,
                    episode: item.episodeToAir,
                    isSeasonFinale: item.lastEpisode === item.episodeToAir && item.episodeToAir !== 1,
                });
                continue;
            }

            if (notification && compareCalendarDates(notification.releaseDate, item.date) === 0) continue;
            await this.repository.createMediaNotification({
                userId: item.userId,
                name: item.mediaName,
                mediaType,
                mediaId: item.mediaId,
                releaseDate: item.date,
            });
        }
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
