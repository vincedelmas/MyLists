import {UpdateUserMedia} from "@/lib/schemas";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";


type MediaAction = {
    userId: number;
    mediaId: number;
    mediaType: MediaType;
};


export class MediaTrackingService {
    constructor(
        private statsService: StatsService,
        private activityService: MonthlyActivityService,
        private updateHistoryService: UpdateHistoryService,
        private notificationsService: NotificationsService,
        private mediaServiceRegistry: MediaServiceRegistry,
    ) {
    }

    async addMediaToList({ userId, mediaType, mediaId, status }: MediaAction & { status?: Status; silent?: boolean }) {
        const mediaService = this.mediaServiceRegistry.get(mediaType);

        const { newState, media, delta, logPayload } = await mediaService.addMediaToUserList(userId, mediaId, status);
        await this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);

        await this.activityService.logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType: UpdateType.STATUS });
        await this.updateHistoryService.logUpdate({
            media,
            userId,
            mediaType,
            updateType: UpdateType.STATUS,
            payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
        });

        return newState;
    }

    async updateUserMedia({ userId, mediaType, mediaId, payload }: MediaAction & Pick<UpdateUserMedia, "payload">) {
        const { loggedAt, ...mediaPayload } = payload;

        const timestamp = loggedAt ? `${loggedAt} 12:00:00` : undefined;
        if (timestamp) {
            await this.updateHistoryService.deleteRecentInitialAdd(userId, mediaType, mediaId);
        }

        const mediaService = this.mediaServiceRegistry.get(mediaType);
        const { newState, media, delta, logPayload } = await mediaService.updateUserMediaDetails(userId, mediaId, mediaPayload);

        await this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await this.activityService.logActivityFromDelta({
            delta,
            userId,
            mediaId,
            mediaType,
            activityDate: timestamp,
            updateType: mediaPayload.type,
        });

        if (logPayload) {
            await this.updateHistoryService.logUpdate({
                media,
                userId,
                mediaType,
                timestamp,
                updateType: mediaPayload.type,
                payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
            });
        }

        return newState;
    }

    async removeMediaFromList({ userId, mediaType, mediaId }: MediaAction) {
        const mediaService = this.mediaServiceRegistry.get(mediaType);

        const delta = await mediaService.removeMediaFromUserList(userId, mediaId);
        await this.updateHistoryService.deleteMediaUpdatesForUser(userId, mediaType, mediaId);
        await this.notificationsService.deleteUserMediaNotifications(userId, mediaType, mediaId);
        await this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await this.activityService.deleteAssociatedActivities(userId, mediaType, mediaId);
    }
}
