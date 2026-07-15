import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    addMediaToListSchema,
    deleteUserUpdatesSchema,
    editUserTagSchema,
    mediaTypeMediaIdSchema,
    updateUserCustomCoverSchema,
    updateUserMediaSchema,
    userTagNamesSchema
} from "@/lib/schemas";


export const getUserMediaHistory = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const userUpdatesService = await getContainer().then(c => c.services.userUpdates);
        return userUpdatesService.getUserMediaHistory(currentUser.id, mediaType, mediaId);
    });


export const postAddMediaToList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediaToListSchema)
    .handler(async ({ data: { mediaType, mediaId, status }, context: { currentUser } }) => {
        const userMediaService = await getContainer().then(c => c.services.userMedia);
        return userMediaService.addMediaToList({ mediaType, mediaId, status, userId: currentUser.id });
    });


export const postUpdateUserMedia = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateUserMediaSchema)
    .handler(async ({ data: { mediaType, mediaId, payload }, context: { currentUser } }) => {
        const userMediaService = await getContainer().then(c => c.services.userMedia);
        return userMediaService.updateUserMedia({ mediaType, mediaId, payload, userId: currentUser.id });
    });


export const postUpdateUserCustomCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
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
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const userMediaService = await getContainer().then(c => c.services.userMedia);
        await userMediaService.removeMediaFromList({ mediaType, mediaId, userId: currentUser.id });
    });


export const postDeleteUserUpdates = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(deleteUserUpdatesSchema)
    .handler(async ({ data: { updateIds, returnData }, context: { currentUser } }) => {
        const userUpdatesService = await getContainer().then(c => c.services.userUpdates);
        return userUpdatesService.deleteUserUpdates(currentUser.id, updateIds, returnData);
    });


export const getUserTagNames = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(userTagNamesSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getTagNames(currentUser.id);
    });


export const postEditUserTag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(editUserTagSchema)
    .handler(async ({ data: { mediaType, mediaId, tag, action }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);

        return mediaService.editUserTag(currentUser.id, tag, action, mediaId);
    });
