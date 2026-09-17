import {UpdateUserMedia} from "@/lib/schemas";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {ContinueMediaType, getContinueItem} from "@/lib/server/domain/continue/continue.repository";


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

    addMediaToList({ userId, mediaType, mediaId, status }: MediaAction & { status?: Status; silent?: boolean }) {
        return withTransaction(() => {
            const mediaService = this.mediaServiceRegistry.get(mediaType);

            const { newState, media, delta, logPayload } = mediaService.addMediaToUserList(userId, mediaId, status);
            this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);

            this.activityService.logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType: UpdateType.STATUS });
            this.updateHistoryService.logUpdate({
                media,
                userId,
                mediaType,
                updateType: UpdateType.STATUS,
                payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
            });

            return newState;
        });
    }

    updateUserMedia({ userId, mediaType, mediaId, payload }: MediaAction & Pick<UpdateUserMedia, "payload">) {
        return withTransaction(() => {
            const { loggedAt, ...mediaPayload } = payload;

            const timestamp = loggedAt ? `${loggedAt} 12:00:00` : undefined;
            if (timestamp) {
                this.updateHistoryService.deleteRecentInitialAdd(userId, mediaType, mediaId);
            }

            const mediaService = this.mediaServiceRegistry.get(mediaType);
            const { newState, media, delta, logPayload, statusLogPayload } = mediaService.updateUserMediaDetails(userId, mediaId, mediaPayload);

            this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
            this.activityService.logActivityFromDelta({
                delta,
                userId,
                mediaId,
                mediaType,
                activityDate: timestamp,
                updateType: statusLogPayload ? UpdateType.STATUS : mediaPayload.type,
            });

            if (logPayload) {
                this.updateHistoryService.logUpdate({
                    media,
                    userId,
                    mediaType,
                    timestamp,
                    updateType: mediaPayload.type,
                    payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
                });
            }

            if (statusLogPayload) {
                this.updateHistoryService.logUpdate({
                    media,
                    userId,
                    mediaType,
                    timestamp,
                    updateType: UpdateType.STATUS,
                    payload: { old_value: statusLogPayload.oldValue, new_value: statusLogPayload.newValue },
                });
            }

            return newState;
        });
    }

    continueUserMedia({ userId, mediaType, mediaId }: MediaAction & { mediaType: ContinueMediaType }) {
        return withTransaction(() => {
            const item = getContinueItem(userId, mediaType, mediaId);
            const definition = getMediaDefinition(mediaType).continue;

            // Stale card must not restart title that was completed, paused, or removed elsewhere
            if (!item || item.status !== definition.status) {
                return { item: null, completed: false };
            }

            const payload = definition.getUpdate(item);
            if (!payload) return { item, completed: false };

            const state = this.updateUserMedia({ userId, mediaType, mediaId, payload });
            const completed = state.status === Status.COMPLETED;

            return { item: completed ? null : getContinueItem(userId, mediaType, mediaId), completed };
        });
    }

    removeMediaFromList({ userId, mediaType, mediaId }: MediaAction) {
        return withTransaction(() => {
            const mediaService = this.mediaServiceRegistry.get(mediaType);

            const delta = mediaService.removeMediaFromUserList(userId, mediaId);
            this.updateHistoryService.deleteMediaUpdatesForUser(userId, mediaType, mediaId);
            this.notificationsService.deleteUserMediaNotifications(userId, mediaType, mediaId);
            this.statsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
            this.activityService.deleteAssociatedActivities(userId, mediaType, mediaId);
        });
    }
}
