import {and, asc, eq} from "drizzle-orm";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {libraryTag} from "@/lib/server/database/schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {getContainer} from "@/lib/server/core/container";
import {CoverType} from "@/lib/types/media-common.types";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    addMediaToListSchema,
    deleteUserUpdatesSchema,
    editUserTagSchema,
    type UpdateUserCustomCover,
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
        await requireUserMedia(container, currentUser.id, data.mediaType, data.mediaId);
        const customCover = await prepareCustomCover(data);
        await updateCustomCover(container, currentUser.id, data.mediaType, data.mediaId, customCover);
        return requireUserMedia(container, currentUser.id, data.mediaType, data.mediaId);
    });


export const postRemoveMediaFromList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        await removeMedia(container, currentUser.id, mediaType, mediaId);
        await container.notifications.commands.deleteUserMediaNotifications(currentUser.id, mediaType, mediaId);
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
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.userId, currentUser.id),
                eq(libraryTag.kind, mediaType),
            )).orderBy(asc(libraryTag.name));
    });


export const postEditUserTag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(editUserTagSchema)
    .handler(async ({ data: { mediaType, mediaId, tag, action }, context: { currentUser } }) => {
        const container = await getContainer();
        return editTag(container, { userId: currentUser.id, mediaType, mediaId, action, tag });
    });


type Container = Awaited<ReturnType<typeof getContainer>>;

const removeMedia = (container: Container, userId: number, mediaType: MediaType, mediaId: number) => {
    return container.media.get(mediaType).library.commands.remove({ userId, catalogItemId: mediaId });
};

const editTag = (container: Container, params: { userId: number; mediaType: MediaType; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) => {
    const { userId, mediaType, mediaId, action, tag } = params;
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return container.media.get(mediaType).library.commands.editTag({ userId, kind: mediaType, mediaId, action, tag });
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA:
            return container.media.get(mediaType).library.commands.editTag({ userId, mediaId, action, tag });
        default:
            return assertNever(mediaType);
    }
};

const updateCustomCover = (container: Container, userId: number, mediaType: MediaType, mediaId: number, customCover: string | null) => {
    return container.media.get(mediaType).library.commands.updateCustomCover({ userId, catalogItemId: mediaId, customCover });
};

const requireUserMedia = async (container: Container, userId: number, mediaType: MediaType, mediaId: number) => {
    const result = await container.media.get(mediaType).library.read.findUserMedia(userId, mediaId);
    if (!result) throw new FormattedError("Media not in your list");
    return result;
};

const prepareCustomCover = async (payload: UpdateUserCustomCover) => {
    if (payload.remove) return null;
    const dirSaveName: CoverType = `${payload.mediaType}-covers`;
    const customCover = payload.imageFile
        ? await saveUploadedImage({ dirSaveName, file: payload.imageFile })
        : await saveImageFromUrl({ dirSaveName, imageUrl: payload.imageUrl });
    if (!customCover || customCover === "default.jpg") {
        throw new FormattedError("Could not update the custom cover. Please choose another one.");
    }
    return customCover;
};

const assertNever = (value: never): never => {
    throw new Error(`Unsupported media type: ${String(value)}`);
};
