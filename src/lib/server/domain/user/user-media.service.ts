import {UpdateUserMedia} from "@/lib/schemas";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UserStatsService} from "@/lib/server/domain/user/user-stats.service";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {UserUpdatesService} from "@/lib/server/domain/user/user-updates.service";
import {UserActivityService} from "@/lib/server/domain/user/user-activity.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";


type MediaAction = {
    userId: number;
    mediaId: number;
    mediaType: MediaType;
};


export class UserMediaService {
    constructor(
        private userStatsService: UserStatsService,
        private userActivityService: UserActivityService,
        private userUpdatesService: UserUpdatesService,
        private notificationsService: NotificationsService,
        private mediaServiceRegistry: MediaServiceRegistry,
    ) {
    }

    async addMediaToList({ userId, mediaType, mediaId, status, silent = false }: MediaAction & { status?: Status; silent?: boolean }) {
        const mediaService = this.mediaServiceRegistry.get(mediaType);

        const { newState, media, delta, logPayload } = await mediaService.addMediaToUserList(userId, mediaId, status);
        await this.userStatsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);

        if (!silent) {
            await this.userActivityService.logActivityFromDelta({ userId, mediaType, mediaId, delta, newState });
            await this.userUpdatesService.logUpdate({
                media,
                userId,
                mediaType,
                updateType: UpdateType.STATUS,
                payload: { old_value: logPayload.oldValue, new_value: logPayload.newValue },
            });
        }

        return newState;
    }

    async updateUserMedia({ userId, mediaType, mediaId, payload }: MediaAction & Pick<UpdateUserMedia, "payload">) {
        const { loggedAt, ...mediaPayload } = payload;

        const timestamp = loggedAt ? `${loggedAt} 12:00:00` : undefined;
        if (timestamp) {
            await this.userUpdatesService.deleteRecentInitialAdd(userId, mediaType, mediaId);
        }

        const mediaService = this.mediaServiceRegistry.get(mediaType);
        const { newState, media, delta, logPayload } = await mediaService.updateUserMediaDetails(userId, mediaId, mediaPayload);

        await this.userStatsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await this.userActivityService.logActivityFromDelta({ userId, mediaType, mediaId, delta, newState, lastUpdate: timestamp });

        if (logPayload) {
            await this.userUpdatesService.logUpdate({
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
        await this.userUpdatesService.deleteMediaUpdatesForUser(userId, mediaType, mediaId);
        await this.notificationsService.deleteUserMediaNotifications(userId, mediaType, mediaId);
        await this.userStatsService.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
        await this.userActivityService.deleteAssociatedActivities(userId, mediaType, mediaId);
    }
}
