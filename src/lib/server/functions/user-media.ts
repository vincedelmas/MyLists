import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    addMediaToListSchema,
    deleteUserUpdatesSchema,
    editUserTagSchema,
    updateUserCustomCoverSchema,
    updateUserMediaSchema,
    userTagNamesSchema,
    type UpdateUserCustomCover,
    type UpdateUserMedia,
} from "@/lib/contracts/media/library";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {validateLibraryHistory} from "@/lib/contracts/media/projections";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryTag} from "@/lib/server/database/schema";
import {and, asc, eq} from "drizzle-orm";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {CoverType} from "@/lib/types/media-common.types";
import {TagAction, Status} from "@/lib/utils/enums";


export const getUserMediaHistory = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return validateLibraryHistory(await container.library.readers[mediaType].getUserMediaHistory(currentUser.id, mediaId));
        }
        if (mediaType === MediaType.MOVIES) {
            return validateLibraryHistory(await container.library.readers[MediaType.MOVIES].getUserMediaHistory(currentUser.id, mediaId));
        }
        if (mediaType === MediaType.GAMES) {
            return validateLibraryHistory(await container.library.readers[MediaType.GAMES].getUserMediaHistory(currentUser.id, mediaId));
        }
        if (mediaType === MediaType.BOOKS) {
            return validateLibraryHistory(await container.library.readers[MediaType.BOOKS].getUserMediaHistory(currentUser.id, mediaId));
        }
        return validateLibraryHistory(await container.library.readers[MediaType.MANGA].getUserMediaHistory(currentUser.id, mediaId));
    });


export const postAddMediaToList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediaToListSchema)
    .handler(async ({ data: { mediaType, mediaId, status }, context: { currentUser } }) => {
        const container = await getContainer();
        await addMedia(container, { mediaType, mediaId, status, userId: currentUser.id });
        return requireUserMedia(container, currentUser.id, mediaType, mediaId);
    });


export const postUpdateUserMedia = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateUserMediaSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        await updateMedia(container, { ...data, userId: currentUser.id });
        return requireUserMedia(container, currentUser.id, data.mediaType, data.mediaId);
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
        return getDbClient().select({ name: libraryTag.name }).from(libraryTag).where(and(
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

const addMedia = (container: Container, params: { userId: number; mediaType: MediaType; mediaId: number; status?: Status }) => {
    const { userId, mediaType, mediaId, status } = params;
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA:
            return container.library.commands[mediaType].add({ userId, catalogItemId: mediaId, status });
        default:
            return assertNever(mediaType);
    }
};

const updateMedia = (container: Container, params: { userId: number } & UpdateUserMedia) => {
    const { userId, mediaId } = params;
    switch (params.mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return container.library.commands[params.mediaType].update({ userId, mediaId, payload: params.payload });
        case MediaType.MOVIES:
            return container.library.commands[MediaType.MOVIES].update({ userId, mediaId, payload: params.payload });
        case MediaType.GAMES:
            return container.library.commands[MediaType.GAMES].update({ userId, mediaId, payload: params.payload });
        case MediaType.BOOKS:
            return container.library.commands[MediaType.BOOKS].update({ userId, mediaId, payload: params.payload });
        case MediaType.MANGA:
            return container.library.commands[MediaType.MANGA].update({ userId, mediaId, payload: params.payload });
        default:
            return assertNever(params);
    }
};

const removeMedia = (container: Container, userId: number, mediaType: MediaType, mediaId: number) => {
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA:
            return container.library.commands[mediaType].remove({ userId, catalogItemId: mediaId });
        default:
            return assertNever(mediaType);
    }
};

const editTag = (container: Container, params: { userId: number; mediaType: MediaType; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) => {
    const { userId, mediaType, mediaId, action, tag } = params;
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return container.library.commands[mediaType].editTag({ userId, kind: mediaType, mediaId, action, tag });
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA:
            return container.library.commands[mediaType].editTag({ userId, mediaId, action, tag });
        default:
            return assertNever(mediaType);
    }
};

const updateCustomCover = (container: Container, userId: number, mediaType: MediaType, mediaId: number, customCover: string | null) => {
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA:
            return container.library.commands[mediaType].updateCustomCover({ userId, catalogItemId: mediaId, customCover });
        default:
            return assertNever(mediaType);
    }
};

const requireUserMedia = async (container: Container, userId: number, mediaType: MediaType, mediaId: number) => {
    switch (mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
        case MediaType.MOVIES:
        case MediaType.GAMES:
        case MediaType.BOOKS:
        case MediaType.MANGA: {
            const result = await container.library.readers[mediaType].findUserMedia(userId, mediaId);
            if (!result) throw new FormattedError("Media not in your list");
            return result;
        }
        default:
            return assertNever(mediaType);
    }
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
