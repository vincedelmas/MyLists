import {RoleType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";
import {publicAuthMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {validateCollectionSummaries, validateCommunityCollectionsPage} from "@/lib/contracts/media/projections";
import {
    collectionIdSchema,
    collectionMediaItemActionSchema,
    collectionMediaMembershipsSchema,
    communityCollectionsSchema,
    createCollectionSchema,
    mediaCommunityCollectionsSchema,
    updateCollectionSchema,
    userCollectionsSearchSchema
} from "@/lib/schemas";


export const getCommunityCollections = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(communityCollectionsSchema)
    .handler(async ({ data: { search, page, mediaType } }) => {
        const container = await getContainer();
        return validateCommunityCollectionsPage(
            await container.collections.query.getPublicCollections({ search, page, mediaType }),
        );
    });


export const getMediaCommunityCollections = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(mediaCommunityCollectionsSchema)
    .handler(async ({ data: { mediaId, mediaType } }) => {
        const container = await getContainer();
        return validateCollectionSummaries(
            await container.collections.query.getMediaCommunityCollections(mediaId, mediaType),
        );
    });


export const getReadCollectionDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const details = await container.collections.query
            .getCollectionDetails(collectionId, "read", currentUser?.id, currentUser?.role as RoleType | null);
        await container.collections.commands.recordView(collectionId);
        return details;
    });


export const getPaginatedUserCollections = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .validator(userCollectionsSearchSchema)
    .handler(async ({ data: { search, page, mediaType }, context: { targetUser, currentUser } }) => {
        const container = await getContainer();
        return validateCommunityCollectionsPage(await container.collections.query.getPaginatedUserCollections(
            targetUser.id,
            targetUser.privacy,
            { search, page, mediaType },
            currentUser?.id,
            currentUser?.role as RoleType | null,
        ));
    });


export const getUserCollectionMemberships = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionMediaMembershipsSchema)
    .handler(async ({ data: { mediaId, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.collections.query.getUserCollectionMemberships(currentUser.id, mediaId, mediaType);
    });


export const getEditCollectionDetails = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const details = await container.collections.query
            .getCollectionDetails(collectionId, "edit", currentUser?.id, currentUser?.role as RoleType | null);
        await container.collections.commands.recordView(collectionId);
        return details;
    });


export const postCreateCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(createCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionId = await container.collections.commands.create({ ...data, ownerId: currentUser.id });

        return { id: collectionId };
    });


export const postUpdateCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        await container.collections.commands.update({ ...data, actorId: currentUser.id, actorRole: currentUser.role as RoleType });
    });


export const postAddMediaToCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        await container.collections.commands.addItem({ ...data, actorId: currentUser.id });
    });


export const postRemoveMediaFromCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        await container.collections.commands.removeItem({ ...data, actorId: currentUser.id });
    });


export const postDeleteCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        await container.collections.commands.delete(collectionId, currentUser.id, currentUser.role as RoleType);
    });


export const postToggleCollectionLike = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        await container.collections.commands.toggleLike(collectionId, currentUser.id);
    });


export const postCopyCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.collections.commands.copy(collectionId, currentUser.id);
    });
