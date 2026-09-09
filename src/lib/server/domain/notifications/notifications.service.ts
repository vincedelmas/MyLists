import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {compareCalendarDates} from "@/lib/utils/formatting/date";
import {withTransaction} from "@/lib/server/database/async-storage";
import {NotifTab, UpComingMedia} from "@/lib/types/notifications.types";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


export class NotificationsService {
    constructor(private repository: typeof NotificationsRepository) {
    }

    // --- Social Notifications -----------------------------

    async deleteSocialNotifsBetweenUsers(recipientId: number, actorId: number, types: SocialNotifType[]) {
        this.repository.deleteSocialNotifsBetweenUsers(recipientId, actorId, types);
    }

    createSocialNotification(data: { userId: number; actorId: number; type: SocialNotifType; featureRequestId?: number | null }) {
        this.repository.createSocialNotification(data);
    }

    async deleteSocialNotif(userId: number, notificationId: number) {
        return this.repository.deleteSocialNotif(userId, notificationId);
    }

    // --- Media Notifications -----------------------------

    async createMediaNotifications(mediaType: MediaType, mediaArray: UpComingMedia[]) {
        for (const item of mediaArray) {
            withTransaction(() => {
                const notification = this.repository.searchMediaNotification(item.userId, mediaType, item.mediaId);

                if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
                    if (
                        notification
                        && compareCalendarDates(notification.releaseDate, item.date) === 0 &&
                        notification.episode === item.episodeToAir &&
                        notification.season === item.seasonToAir
                    ) {
                        return;
                    }

                    this.repository.createMediaNotification({
                        userId: item.userId,
                        name: item.mediaName,
                        mediaType: mediaType,
                        mediaId: item.mediaId,
                        releaseDate: item.date,
                        season: item.seasonToAir,
                        episode: item.episodeToAir,
                        isSeasonFinale: item.lastEpisode != null && item.lastEpisode === item.episodeToAir && item.episodeToAir !== 1,
                    });
                }
                else {
                    if (notification && compareCalendarDates(notification.releaseDate, item.date) === 0) {
                        return;
                    }

                    this.repository.createMediaNotification({
                        userId: item.userId,
                        name: item.mediaName,
                        mediaType: mediaType,
                        mediaId: item.mediaId,
                        releaseDate: item.date,
                    });
                }
            });
        }
    }

    deleteMediaNotifications(mediaType: MediaType, mediaIds: number[]) {
        return this.repository.deleteMediaNotifications(mediaType, mediaIds);
    }

    deleteUserMediaNotifications(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.deleteUserMediaNotifications(userId, mediaType, mediaId);
    }

    // --- Both Notifications -----------------------------

    async getLastNotifications(userId: number, type: NotifTab, limit = 8) {
        return this.repository.getLastNotifications(userId, type, limit);
    }

    async countUnreadNotifications(userId: number) {
        return this.repository.countUnreadNotifications(userId);
    }

    async markAllAsRead(userId: number, type: NotifTab) {
        return this.repository.markAllAsRead(userId, type);
    }
}
