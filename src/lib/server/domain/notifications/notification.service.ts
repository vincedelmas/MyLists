import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {compareCalendarDates} from "@/lib/utils/date-formatting";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import type {NotificationTab, UpcomingNotificationCandidate} from "@/lib/types/notifications.types";


export interface UpcomingNotificationSource {
    getCandidates(): Promise<UpcomingNotificationCandidate[]>;
}


export class NotificationService {
    private static readonly repository = NotificationsRepository;

    static getLastNotifications(userId: number, type: NotificationTab, limit = 8) {
        return this.repository.getLastNotifications(userId, type, limit);
    }

    static countUnreadNotifications(userId: number) {
        return this.repository.countUnreadNotifications(userId);
    }

    static markAllAsRead(userId: number, type: NotificationTab) {
        return this.repository.markAllAsRead(userId, type);
    }

    static deleteSocialNotification(userId: number, notificationId: number) {
        return this.repository.deleteSocialNotification(userId, notificationId);
    }

    static deleteMediaNotifications(mediaType: MediaType, mediaIds: number[]) {
        return this.repository.deleteMediaNotifications(mediaType, mediaIds);
    }

    static deleteUserMediaNotifications(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.deleteUserMediaNotifications(userId, mediaType, mediaId);
    }

    static deleteSocialNotifsBetweenUsers(recipientId: number, actorId: number, types: SocialNotifType[]) {
        return this.repository.deleteSocialNotifsBetweenUsers(recipientId, actorId, types);
    }

    static createSocialNotification(data: { userId: number; actorId: number; type: SocialNotifType; featureRequestId?: number | null }) {
        return this.repository.createSocialNotification(data);
    }

    static async createUpcomingMediaNotifications(mediaType: MediaType, candidates: UpcomingNotificationCandidate[]) {
        for (const candidate of candidates) {
            const notification = await this.repository.searchMediaNotification(candidate.userId, mediaType, candidate.mediaId);

            const unchanged = notification
                && compareCalendarDates(notification.releaseDate, candidate.date) === 0
                && (notification.season ?? null) === (candidate.seasonToAir ?? null)
                && (notification.episode ?? null) === (candidate.episodeToAir ?? null);

            if (unchanged) continue;

            await this.repository.createMediaNotification({
                mediaType,
                userId: candidate.userId,
                name: candidate.mediaName,
                mediaId: candidate.mediaId,
                releaseDate: candidate.date,
                season: candidate.seasonToAir,
                episode: candidate.episodeToAir,
                isSeasonFinale: candidate.episodeToAir != null
                    ? candidate.lastEpisode === candidate.episodeToAir && candidate.episodeToAir !== 1
                    : undefined,
            });
        }
    }
}
