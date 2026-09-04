import {compareCalendarDates} from "@/lib/utils/date-formatting";
import {MediaType, type SocialNotifType} from "@/lib/utils/enums";
import type {NotifTab, UpComingMedia} from "@/lib/types/notifications.types";
import type {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


export const createNotificationsService = (repository: NotificationsRepository) => ({
    // --- Social Notifications -----------------------------

    async deleteSocialNotifsBetweenUsers(recipientId: number, actorId: number, types: SocialNotifType[]) {
        await repository.deleteSocialNotifsBetweenUsers(recipientId, actorId, types);
    },

    async createSocialNotification(data: { userId: number; actorId: number; type: SocialNotifType; featureRequestId?: number | null }) {
        await repository.createSocialNotification(data);
    },

    async deleteSocialNotif(userId: number, notificationId: number) {
        return repository.deleteSocialNotif(userId, notificationId);
    },

    // --- Media Notifications -----------------------------

    async createMediaNotifications(mediaType: MediaType, mediaArray: UpComingMedia[]) {
        for (const item of mediaArray) {
            const notification = await repository.searchMediaNotification(item.userId, mediaType, item.mediaId);

            if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
                if (
                    notification
                    && compareCalendarDates(notification.releaseDate, item.date) === 0
                    && notification.episode === item.episodeToAir
                    && notification.season === item.seasonToAir
                ) {
                    continue;
                }

                await repository.createMediaNotification({
                    userId: item.userId,
                    name: item.mediaName,
                    mediaType,
                    mediaId: item.mediaId,
                    releaseDate: item.date,
                    season: item.seasonToAir,
                    episode: item.episodeToAir,
                    isSeasonFinale: item.lastEpisode === item.episodeToAir && item.episodeToAir !== 1,
                });
            }
            else {
                if (notification && compareCalendarDates(notification.releaseDate, item.date) === 0) {
                    continue;
                }

                await repository.createMediaNotification({
                    userId: item.userId,
                    name: item.mediaName,
                    mediaType,
                    mediaId: item.mediaId,
                    releaseDate: item.date,
                });
            }
        }
    },

    async deleteMediaNotifications(mediaType: MediaType, mediaIds: number[]) {
        return repository.deleteMediaNotifications(mediaType, mediaIds);
    },

    async deleteUserMediaNotifications(userId: number, mediaType: MediaType, mediaId: number) {
        return repository.deleteUserMediaNotifications(userId, mediaType, mediaId);
    },

    // --- Both Notifications -----------------------------

    async getLastNotifications(userId: number, type: NotifTab, limit = 8) {
        return repository.getLastNotifications(userId, type, limit);
    },

    async countUnreadNotifications(userId: number) {
        return repository.countUnreadNotifications(userId);
    },

    async markAllAsRead(userId: number, type: NotifTab) {
        return repository.markAllAsRead(userId, type);
    },
});


export type NotificationsService = ReturnType<typeof createNotificationsService>;
