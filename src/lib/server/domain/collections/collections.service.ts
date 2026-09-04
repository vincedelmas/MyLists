import {notFound} from "@tanstack/react-router";
import {MediaInfo} from "@/lib/types/activity.types";
import {CollectionItemInput} from "@/lib/types/collections.types";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {DenialReason, MediaType, PrivacyType} from "@/lib/utils/enums";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import type {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {Actor, AuthorizationService, CollectionAction, collectionPolicy} from "@/lib/server/authorization";


export const createCollectionsService = (
    authorizationService: AuthorizationService,
    repository: CollectionsRepository,
    mediaRegistry: MediaServiceRegistry,
) => {
    const normalizeItems = (items: CollectionItemInput[]) => {
        const seen = new Set<number>();
        return items.filter((item) => {
            if (seen.has(item.mediaId)) return false;
            seen.add(item.mediaId);
            return true;
        });
    };

    const enrichWithPreviews = async (collections: Awaited<ReturnType<CollectionsRepository["getUserCollections"]>>, actor: Actor) => {
        if (collections.length === 0) return [];

        const mediaMapByType = new Map<MediaType, Set<number>>();

        for (const collection of collections) {
            if (!mediaMapByType.has(collection.mediaType)) {
                mediaMapByType.set(collection.mediaType, new Set<number>());
            }
            const idSet = mediaMapByType.get(collection.mediaType)!;
            collection.previewItems.forEach((id: number) => idSet.add(id));
        }

        const mediaLookup = new Map<string, MediaInfo>();

        await Promise.all([...mediaMapByType.entries()].map(async ([mediaType, ids]) => {
            const mediaService = mediaRegistry.get(mediaType);
            const mediaDetails = await mediaService.getMediaDetailsByIds([...ids]);
            mediaDetails.forEach((media) => mediaLookup.set(`${mediaType}-${media.id}`, media));
        }));

        return collections.map((collection) => {
            const policyCapabilities = collectionPolicy.capabilities(actor, collection);

            return {
                ...collection,
                capabilities: {
                    edit: policyCapabilities.edit,
                    delete: policyCapabilities.delete,
                },
                previews: collection.previewItems.map((id: number) => {
                    const media = mediaLookup.get(`${collection.mediaType}-${id}`);
                    if (!media) return null;

                    return {
                        mediaId: media.id,
                        mediaName: media.name,
                        mediaCover: media.imageCover,
                        releaseDate: media.releaseDate,
                    };
                }).filter((item): item is NonNullable<typeof item> => item !== null),
            };
        });
    };

    const assertAction = (collection: Parameters<typeof collectionPolicy.decide>[2], actor: Actor, action: CollectionAction, message: string) => {
        if (!collectionPolicy.decide(actor, action, collection).allowed) {
            throw new FormattedError(message);
        }
    };

    const service = {
        async getCollectionDetails(collectionId: number, mode: "read" | "edit", actor: Actor, page?: number) {
            const collection = await repository.getCollectionById(collectionId);
            if (!collection) throw notFound();

            const decision = await authorizationService.decideCollection(actor, mode, collection);
            if (!decision.allowed) {
                throw new UnauthorizedError(decision.reason === DenialReason.PROFILE_RESTRICTED ? "restricted" : "private");
            }

            const [itemResults, isLiked] = await Promise.all([
                mode === "read"
                    ? repository.getPaginatedCollectionItems(collectionId, page)
                    : repository.getCollectionItems(collectionId).then((items) => ({
                        items,
                        page: 1,
                        total: items.length,
                        pages: items.length > 0 ? 1 : 0,
                        perPage: Math.max(items.length, 1),
                    })),
                actor.kind === "user" ? repository.findLikedCollection(actor.id, collectionId) : Promise.resolve(null),
                repository.incrementViewCount(collectionId),
            ]);

            const { items } = itemResults;
            const mediaService = mediaRegistry.get(collection.mediaType);
            const mediaRows = await mediaService.getMediaDetailsByIds(items.map(i => i.mediaId), actor.kind === "user" ? actor.id : undefined);
            const mediaMap = new Map(mediaRows.map((m) => [m.id, m]));
            const capabilities = await authorizationService.getCollectionCapabilities(actor, collection);

            const detailedItems = items.map((item) => {
                const media = mediaMap.get(item.mediaId)!;
                return {
                    mediaId: item.mediaId,
                    mediaName: media.name,
                    orderIndex: item.orderIndex,
                    annotation: item.annotation,
                    mediaCover: media.imageCover,
                    inUserList: media.inUserList,
                    releaseDate: media.releaseDate,
                };
            });

            return {
                ...itemResults,
                collection,
                capabilities,
                isLiked: !!isLiked,
                items: detailedItems,
            };
        },

        async getUserCollections(targetUserId: number, actor: Actor, mediaType?: MediaType) {
            const collections = await repository.getUserCollections(targetUserId, actor, mediaType);
            return enrichWithPreviews(collections, actor);
        },

        async getPaginatedUserCollections(targetUserId: number, params: Omit<UserCollectionsSearch, "username">, actor: Actor) {
            const paginatedCollections = await repository.getPaginatedUserCollections(targetUserId, actor, params);
            const results = await enrichWithPreviews(paginatedCollections.items, actor);

            return {
                ...paginatedCollections,
                items: results,
            };
        },

        async getPublicCollections(params: CommunitySearch, actor: Actor) {
            const paginatedCollections = await repository.getPublicCollections(params);
            const results = await enrichWithPreviews(paginatedCollections.items, actor);

            return {
                ...paginatedCollections,
                items: results,
            };
        },

        async getMediaCommunityCollections(mediaId: number, mediaType: MediaType, actor: Actor) {
            const collections = await repository.getMediaCommunityCollections(mediaId, mediaType);
            return enrichWithPreviews(collections, actor);
        },

        async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
            return repository.getUserCollectionMemberships(ownerId, mediaId, mediaType);
        },

        async addMediaToCollection(params: { actor: Actor; mediaId: number; mediaType: MediaType; collectionId: number }) {
            const collection = await repository.getCollectionById(params.collectionId);
            if (!collection || collection.mediaType !== params.mediaType) {
                throw new FormattedError("Unauthorized to update this collection.");
            }
            assertAction(collection, params.actor, "addItem", "Unauthorized to update this collection.");

            const nextOrderIndex = await repository.getMaxCollectionItemOrder(params.collectionId) + 1;
            await repository.insertCollectionItem({
                annotation: null,
                mediaId: params.mediaId,
                orderIndex: nextOrderIndex,
                mediaType: params.mediaType,
                collectionId: params.collectionId,
            });
        },

        async removeMediaFromCollection(params: { actor: Actor; mediaId: number; mediaType: MediaType; collectionId: number }) {
            const collection = await repository.getCollectionById(params.collectionId);
            if (!collection || collection.mediaType !== params.mediaType) {
                throw new FormattedError("Unauthorized to update this collection.");
            }
            assertAction(collection, params.actor, "removeItem", "Unauthorized to update this collection.");

            if (collection.itemsCount <= 1) {
                throw new FormattedError("A collection must contain at least one item.");
            }

            await repository.deleteCollectionItem(params.collectionId, params.mediaId);
        },

        async createCollection(params: {
            title: string;
            ownerId: number;
            ordered: boolean;
            privacy: PrivacyType;
            mediaType: MediaType;
            description?: string | null;
            items: CollectionItemInput[];
        }) {
            const { items, ...collectionData } = params;
            const uniqueItems = normalizeItems(items);

            const collectionId = await repository.createCollection({ ...collectionData });
            await repository.replaceCollectionItems(collectionId, uniqueItems.map((item, index) => ({
                collectionId,
                mediaId: item.mediaId,
                orderIndex: index + 1,
                mediaType: params.mediaType,
                annotation: item.annotation ?? null,
            })));

            return collectionId;
        },

        async updateCollection(params: {
            actor: Actor;
            title: string;
            ordered: boolean;
            privacy: PrivacyType;
            collectionId: number;
            description?: string | null;
            items: CollectionItemInput[];
        }) {
            const collection = await repository.getCollectionById(params.collectionId);
            if (!collection) throw notFound();

            assertAction(collection, params.actor, "edit", "Unauthorized to update this collection.");

            const sanitizedItems = normalizeItems(params.items);
            await repository.updateCollection(params.collectionId, {
                title: params.title,
                privacy: params.privacy,
                ordered: params.ordered,
                description: params.description ?? null,
            });

            await repository.replaceCollectionItems(params.collectionId, sanitizedItems.map((item, index) => ({
                mediaId: item.mediaId,
                orderIndex: index + 1,
                mediaType: collection.mediaType,
                collectionId: params.collectionId,
                annotation: item.annotation ?? null,
            })));
        },

        async deleteCollection(collectionId: number, actor: Actor) {
            const collection = await repository.getCollectionById(collectionId);
            if (!collection) throw notFound();

            assertAction(collection, actor, "delete", "Unauthorized to delete this collection.");

            await repository.deleteCollection(collectionId);
        },

        async toggleLike(collectionId: number, actor: Actor) {
            const collection = await repository.getCollectionById(collectionId);
            if (!collection) throw notFound();
            if (actor.kind === "anonymous") throw new FormattedError("Unauthorized to like this collection.");

            const decision = await authorizationService.decideCollection(actor, "like", collection);
            if (!decision.allowed) throw new UnauthorizedError("private");

            const existingLike = await repository.findLikedCollection(actor.id, collectionId);
            if (existingLike) {
                await repository.deleteLike(existingLike.id);
                await repository.decrementLikeCount(collectionId);
            }
            else {
                await repository.insertLike(actor.id, collectionId);
                await repository.incrementLikeCount(collectionId);
            }
        },

        async copyCollection(collectionId: number, actor: Actor) {
            const collection = await repository.getCollectionById(collectionId);
            if (!collection) throw notFound();
            if (actor.kind === "anonymous") throw new FormattedError("Unauthorized to copy this collection.");

            const decision = await authorizationService.decideCollection(actor, "copy", collection);
            if (!decision.allowed) throw new UnauthorizedError("private");

            const items = await repository.getCollectionItems(collectionId);
            const createdId = await repository.createCollection({
                ownerId: actor.id,
                ordered: collection.ordered,
                privacy: PrivacyType.PRIVATE,
                mediaType: collection.mediaType,
                description: collection.description,
                title: `Copy of ${collection.title}`,
            });

            if (items.length > 0) {
                await repository.replaceCollectionItems(createdId, items.map((item) => ({
                    mediaId: item.mediaId,
                    collectionId: createdId,
                    annotation: item.annotation,
                    orderIndex: item.orderIndex,
                    mediaType: collection.mediaType,
                })));
            }

            await repository.incrementCopyCount(collectionId);

            return { id: createdId };
        },
    };

    return service;
};
