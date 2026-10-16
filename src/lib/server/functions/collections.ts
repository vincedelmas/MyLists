import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    collectionDetailsReadSchema,
    collectionFilterSearchSchema,
    collectionIdSchema,
    collectionMediaItemActionSchema,
    collectionsBrowseFiltersSchema,
    createCollectionSchema,
    mediaTypeMediaIdSchema,
    updateCollectionSchema
} from "@/lib/schemas";


export const getCommunityCollections = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(collectionsBrowseFiltersSchema)
    .handler(async ({ data: { search, page, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getPublicCollections({ search, page, mediaType }, toActor(currentUser));
    });


export const getMediaCommunityCollections = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaId, mediaType }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getMediaCommunityCollections(mediaId, mediaType, toActor(currentUser));
    });


export const getReadCollectionDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(collectionDetailsReadSchema)
    .handler(async ({ data: { collectionId, includeFilterOptions, ...filters }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.getCollectionDetails(collectionId, "read", toActor(currentUser), filters, includeFilterOptions);
    });


export const getCollectionSearchFilters = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(collectionFilterSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.collections.searchCollectionFilters(data, toActor(currentUser));
    });


export const postRecordCollectionView = createServerFn({ method: "POST" })
    .middleware([publicAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.collections.recordCollectionView(collectionId, toActor(currentUser));
    });


export const getUserCollectionMemberships = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
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
    .middleware([requiredAuthMiddleware])
    .validator(createCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        const collectionId = collectionService.createCollection({ ...data, ownerId: currentUser.id });

        return { id: collectionId };
    });


export const postUpdateCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(updateCollectionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        collectionService.updateCollection({ ...data, actor: toActor(currentUser) });
    });


export const postAddMediaToCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        collectionService.addMediaToCollection({ ...data, actor: toActor(currentUser) });
    });


export const postRemoveMediaFromCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionMediaItemActionSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        collectionService.removeMediaFromCollection({ ...data, actor: toActor(currentUser) });
    });


export const postDeleteCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        collectionService.deleteCollection(collectionId, toActor(currentUser));
    });


export const postToggleCollectionLike = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.toggleLike(collectionId, toActor(currentUser));
    });


export const postCopyCollection = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(collectionIdSchema)
    .handler(async ({ data: { collectionId }, context: { currentUser } }) => {
        const container = await getContainer();
        const collectionService = container.services.collections;
        return collectionService.copyCollection(collectionId, toActor(currentUser));
    });
