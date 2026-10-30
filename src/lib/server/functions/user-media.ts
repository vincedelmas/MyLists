import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {ActivityCorrectionRequired} from "@/lib/server/domain/tracking/monthly-activity.service";
import {requiredMediaReadMiddleware, requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";
import {
    addMediaToListSchema,
    deleteUserUpdatesSchema,
    editUserTagSchema,
    mediaTypeMediaIdSchema,
    updateUserCustomCoverSchema,
    updateUserMediaSchema,
    updateUserMediaNotificationsSchema,
    userTagNamesSchema
} from "@/lib/schemas";


export const getUserMediaHistory = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const updateHistoryService = await getContainer().then(c => c.services.updateHistory);
        return updateHistoryService.getUserMediaHistory(currentUser.id, mediaType, mediaId);
    });


export const postAddMediaToList = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(addMediaToListSchema)
    .handler(async ({ data: { mediaType, mediaId, status }, context: { currentUser } }) => {
        const mediaTrackingService = await getContainer().then(c => c.services.mediaTracking);
        return mediaTrackingService.addMediaToList({ mediaType, mediaId, status, userId: currentUser.id });
    });


export const postUpdateUserMedia = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(updateUserMediaSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();

        try {
            const saved = container.services.mediaTracking.updateUserMedia({ ...data, userId: currentUser.id });
            const seasons = data.mediaType === MediaType.SERIES || data.mediaType === MediaType.ANIME
                ? container.registries.mediaService.get(data.mediaType).getUserSeasons(currentUser.id, data.mediaId)
                : undefined;

            return {
                kind: "saved" as const,
                ...saved,
                seasons,
                history: container.services.updateHistory.getUserMediaHistory(currentUser.id, data.mediaType, data.mediaId),
            };
        }
        catch (error) {
            if (error instanceof ActivityCorrectionRequired) {
                return {
                    preview: error.preview,
                    kind: "correction-required" as const,
                };
            }

            throw error;
        }
    });


export const postUpdateUserMediaNotifications = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(updateUserMediaNotificationsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(data.mediaType);
        return mediaService.updateUserMediaNotifications(currentUser.id, data.mediaId, data.releaseNotificationsEnabled);
    });


export const postUpdateUserCustomCover = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator((data) => {
        return updateUserCustomCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data);
    })
    .handler(async ({ data, context: { currentUser } }) => {
        const { mediaType } = data;

        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);

        return mediaService.updateUserCustomCover(currentUser.id, data);
    });


export const postRemoveMediaFromList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const mediaTrackingService = await getContainer().then(c => c.services.mediaTracking);
        mediaTrackingService.removeMediaFromList({ mediaType, mediaId, userId: currentUser.id });
    });


export const postDeleteUserUpdates = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(deleteUserUpdatesSchema)
    .handler(async ({ data: { updateIds, returnData }, context: { currentUser } }) => {
        const updateHistoryService = await getContainer().then(c => c.services.updateHistory);
        return updateHistoryService.deleteUserUpdates(currentUser.id, updateIds, returnData);
    });


export const getUserTagNames = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .validator(userTagNamesSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getTagNames(currentUser.id);
    });


export const postEditUserTag = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(editUserTagSchema)
    .handler(async ({ data: { mediaType, mediaId, tag, action }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);

        const savedTag = mediaService.editUserTag(currentUser.id, tag, action, mediaId);
        return { tag: savedTag, tagNames: await mediaService.getTagNames(currentUser.id) };
    });
