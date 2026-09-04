import {UpdateUserMedia} from "@/lib/schemas";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import type {StatsService} from "@/lib/server/domain/stats/stats.service";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import type {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import type {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import type {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";


type MediaAction = {
    userId: number;
    mediaId: number;
    mediaType: MediaType;
};


export const createMediaTrackingService = (
    statsService: StatsService,
    activityService: MonthlyActivityService,
    updateHistoryService: UpdateHistoryService,
    notificationsService: NotificationsService,
    mediaServiceRegistry: MediaServiceRegistry,
) => ({
    async addMediaToList({ userId, mediaType, mediaId, status }: MediaAction & { status?: Status; silent?: boolean }) {
        const mediaService = mediaServiceRegistry.get(mediaType);

        const { newState, media, delta, logPayload } = await mediaService.addMediaToUserList(userId, mediaId, status);
        await statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);

        await activityService.logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType: UpdateType.STATUS });
        await updateHistoryService.logUpdate({
            media,
            userId,
            mediaType,
            updateType: UpdateType.STATUS,
            payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
        });

        return newState;
    },

    async updateUserMedia({ userId, mediaType, mediaId, payload }: MediaAction & Pick<UpdateUserMedia, "payload">) {
        const { loggedAt, ...mediaPayload } = payload;

        const timestamp = loggedAt ? `${loggedAt} 12:00:00` : undefined;
        if (timestamp) {
            await updateHistoryService.deleteRecentInitialAdd(userId, mediaType, mediaId);
        }

        const mediaService = mediaServiceRegistry.get(mediaType);
        const { newState, media, delta, logPayload } = await mediaService.updateUserMediaDetails(userId, mediaId, mediaPayload);

        await statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await activityService.logActivityFromDelta({
            delta,
            userId,
            mediaId,
            mediaType,
            activityDate: timestamp,
            updateType: mediaPayload.type,
        });

        if (logPayload) {
            await updateHistoryService.logUpdate({
                media,
                userId,
                mediaType,
                timestamp,
                updateType: mediaPayload.type,
                payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
            });
        }

        return newState;
    },

    async removeMediaFromList({ userId, mediaType, mediaId }: MediaAction) {
        const mediaService = mediaServiceRegistry.get(mediaType);

        const delta = await mediaService.removeMediaFromUserList(userId, mediaId);
        await updateHistoryService.deleteMediaUpdatesForUser(userId, mediaType, mediaId);
        await notificationsService.deleteUserMediaNotifications(userId, mediaType, mediaId);
        await statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await activityService.deleteAssociatedActivities(userId, mediaType, mediaId);
    },
});


export type MediaTrackingService = ReturnType<typeof createMediaTrackingService>;
