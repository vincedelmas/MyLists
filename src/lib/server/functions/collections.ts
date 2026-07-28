import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {publicAuthMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
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
    .handler(async ({ data: { search, page, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getPublicCollections({ search, page, mediaType }, toActor(currentUser));
    });


export const getMediaCommunityCollections = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(mediaCommunityCollectionsSchema)
    .handler(async ({ data: { mediaId, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getMediaCommunityCollections(mediaId, mediaType, toActor(currentUser));
    });


export const getReadCollectionDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getCollectionDetails(collectionId, "read", toActor(currentUser));
    });


export const getPaginatedUserCollections = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(userCollectionsSearchSchema)
    .handler(async ({ data: { search, page, mediaType }, context: { user, currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getPaginatedUserCollections(user.id, { search, page, mediaType }, toActor(currentUser));
    });


export const getUserCollectionMemberships = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionMediaMembershipsSchema)
    .handler(async ({ data: { mediaId, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getUserCollectionMemberships(currentUser.id, mediaId, mediaType);
    });


export const getEditCollectionDetails = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getCollectionDetails(collectionId, "edit", toActor(currentUser));
    });


export const postCreateCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(createCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        const collectionId = await collectionService.createCollection({ ...data, ownerId: currentUser.id });

        return { id: collectionId };
    });


export const postUpdateCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        await collectionService.updateCollection({ ...data, actor: toActor(currentUser) });
    });


export const postAddMediaToCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        await collectionService.addMediaToCollection({ ...data, actor: toActor(currentUser) });
    });


export const postRemoveMediaFromCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        await collectionService.removeMediaFromCollection({ ...data, actor: toActor(currentUser) });
    });


export const postDeleteCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        await collectionService.deleteCollection(collectionId, toActor(currentUser));
    });


export const postToggleCollectionLike = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.toggleLike(collectionId, toActor(currentUser));
    });


export const postCopyCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.copyCollection(collectionId, toActor(currentUser));
    });
