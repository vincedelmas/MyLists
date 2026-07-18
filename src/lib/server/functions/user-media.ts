import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {FormattedError} from "@/lib/utils/error-classes";
import {getContainer} from "@/lib/server/core/container";
import {MediaType} from "@/lib/utils/enums";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    addMediaToListSchema,
    deleteUserUpdatesSchema,
    editUserTagSchema,
    updateUserCustomCoverSchema,
    updateUserMediaSchema,
    userTagNamesSchema,
} from "@/lib/contracts/media/library";


export const getUserMediaHistory = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.read.getUserMediaHistory(currentUser.id, mediaId);
    });


export const postAddMediaToList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediaToListSchema)
    .handler(async ({ data: { mediaType, mediaId, status }, context: { currentUser } }) => {
        const container = await getContainer();

        await container.media.get(mediaType).library.commands.add({ userId: currentUser.id, catalogItemId: mediaId, status });
        const result = await container.media.get(mediaType).library.read.findUserMedia(currentUser.id, mediaId);
        if (!result) throw new FormattedError("Media not in your list");

        return result;
    });


export const postUpdateUserMedia = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateUserMediaSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const mediaId = data.mediaId;
        const userId = currentUser.id;
        const container = await getContainer();

        switch (data.mediaType) {
            case MediaType.SERIES:
            case MediaType.ANIME:
                await container.media.get(data.mediaType).library.commands.update({ userId, mediaId, payload: data.payload });
                break;
            case MediaType.MOVIES:
                await container.media.get(MediaType.MOVIES).library.commands.update({ userId, mediaId, payload: data.payload });
                break;
            case MediaType.GAMES:
                await container.media.get(MediaType.GAMES).library.commands.update({ userId, mediaId, payload: data.payload });
                break;
            case MediaType.BOOKS:
                await container.media.get(MediaType.BOOKS).library.commands.update({ userId, mediaId, payload: data.payload });
                break;
            case MediaType.MANGA:
                await container.media.get(MediaType.MANGA).library.commands.update({ userId, mediaId, payload: data.payload });
                break;
            default:
                assertNever(data);
        }

        const result = await container.media.get(data.mediaType).library.read.findUserMedia(userId, mediaId);
        if (!result) throw new FormattedError("Media not in your list");

        return result;
    });


export const postUpdateUserCustomCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => {
        return updateUserCustomCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data);
    })
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.media.get(data.mediaType).library.covers.update(currentUser.id, data);
    });


export const postRemoveMediaFromList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        await removeMedia(container, currentUser.id, mediaType, mediaId);
        await container.notifications.deleteUserMediaNotifications(currentUser.id, mediaType, mediaId);
    });


export const postDeleteUserUpdates = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(deleteUserUpdatesSchema)
    .handler(async ({ data: { updateIds, returnData }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.profile.updates.commands.deleteUserUpdates(currentUser.id, updateIds, returnData);
    });


export const getUserTagNames = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(userTagNamesSchema)
    .handler(async ({ data: { mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.tags.getNames(currentUser.id);
    });


export const postEditUserTag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(editUserTagSchema)
    .handler(async ({ data: { mediaType, mediaId, tag, action }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.tags.edit({
            userId: currentUser.id,
            mediaId,
            action,
            tag,
        });
    });


type Container = Awaited<ReturnType<typeof getContainer>>;

const removeMedia = (container: Container, userId: number, mediaType: MediaType, mediaId: number) => {
    return container.media.get(mediaType).library.commands.remove({ userId, catalogItemId: mediaId });
};

const assertNever = (value: never): never => {
    throw new Error(`Unsupported media type: ${String(value)}`);
};
