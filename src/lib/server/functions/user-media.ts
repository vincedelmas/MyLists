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
import {MediaType} from "@/lib/utils/enums";


export const getUserMediaHistory = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvDetailsReaders[mediaType].getUserMediaHistory(currentUser.id, mediaId);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieDetailsReader.getUserMediaHistory(currentUser.id, mediaId);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameDetailsReader.getUserMediaHistory(currentUser.id, mediaId);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookDetailsReader.getUserMediaHistory(currentUser.id, mediaId);
        }
        return container.features.mangaDetailsReader.getUserMediaHistory(currentUser.id, mediaId);
    });


export const postAddMediaToList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediaToListSchema)
    .handler(async ({ data: { mediaType, mediaId, status }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.library.commands.add({ mediaType, mediaId, status, userId: currentUser.id });
    });


export const postUpdateUserMedia = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateUserMediaSchema)
    .handler(async ({ data: { mediaType, mediaId, payload }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.library.commands.update({ mediaType, mediaId, payload, userId: currentUser.id });
    });


export const postUpdateUserCustomCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => {
        return updateUserCustomCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data);
    })
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.library.commands.updateCustomCover(currentUser.id, data);
    });


export const postRemoveMediaFromList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        await container.library.commands.remove({ mediaType, mediaId, userId: currentUser.id });
        await container.services.notifications.deleteUserMediaNotifications(currentUser.id, mediaType, mediaId);
    });


export const postDeleteUserUpdates = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(deleteUserUpdatesSchema)
    .handler(async ({ data: { updateIds, returnData }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.userUpdates.deleteUserUpdates(currentUser.id, updateIds, returnData);
    });


export const getUserTagNames = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(userTagNamesSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.library.commands.getTagNames(currentUser.id, mediaType);
    });


export const postEditUserTag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(editUserTagSchema)
    .handler(async ({ data: { mediaType, mediaId, tag, action }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.library.commands.editTag({ userId: currentUser.id, mediaType, mediaId, action, tag });
    });
