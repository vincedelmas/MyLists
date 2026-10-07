import {notFound} from "@tanstack/react-router";
import {uniqueBy} from "@/lib/utils/arrays-objects";
import {toItemKey} from "@/lib/utils/media/item-key";
import type {MediaInfo} from "@/lib/types/media-common.types";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {CollectionItemInput} from "@/lib/types/collections.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {DenialReason, MediaType, PrivacyType} from "@/lib/utils/enums";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {Actor, AuthorizationService, CollectionAction, collectionPolicy} from "@/lib/server/authorization";


export class CollectionsService {
    constructor(
        private authorizationService: AuthorizationService,
        private repository: typeof CollectionsRepository,
        private mediaRegistry: MediaServiceRegistry,
    ) {
    }

    async getCollectionDetails(collectionId: number, mode: "read" | "edit", actor: Actor, filters: MediaBrowseFilters = { page: 1 }) {
        const collection = this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();

        const decision = this.authorizationService.decideCollection(actor, mode, collection);
        if (!decision.allowed) {
            throw new UnauthorizedError(decision.reason === DenialReason.PROFILE_RESTRICTED ? "restricted" : "private");
        }

        const viewerId = actor.kind === "user" ? actor.id : undefined;
        const [isLiked, capabilities] = await Promise.all([
            actor.kind === "user" ? this.repository.findLikedCollection(actor.id, collectionId) : Promise.resolve(null),
            this.authorizationService.getCollectionCapabilities(actor, collection),
            this.repository.incrementViewCount(collectionId),
        ]);

        if (mode === "read") {
            const results = await this.repository.getPaginatedCollectionItems(collectionId, collection.mediaTypes, filters, viewerId);

            return {
                ...results,
                collection,
                capabilities,
                isLiked: !!isLiked,
            };
        }

        const items = this.repository.getCollectionItems(collectionId);
        const mediaMap = await this._getMediaLookup(items, viewerId);

        const detailedItems = items.map((item) => {
            const media = mediaMap.get(toItemKey(item))!;

            return {
                status: null,
                rating: null,
                addedAt: null,
                favorite: null,
                lastUpdated: null,
                mediaId: item.mediaId,
                mediaName: media.name,
                mediaType: item.mediaType,
                orderIndex: item.orderIndex,
                annotation: item.annotation,
                inUserList: media.inUserList,
                releaseDate: media.releaseDate,
                mediaCover: getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, media.customCover ?? media.imageCover),
            };
        });

        return {
            page: 1,
            collection,
            capabilities,
            isLiked: !!isLiked,
            total: items.length,
            items: detailedItems,
            pages: items.length > 0 ? 1 : 0,
            perPage: Math.max(items.length, 1),
            filterOptions: {
                tags: [],
                genres: [],
                mediaTypes: collection.mediaTypes,
            },
        };
    }

    async getUserCollections(targetUserId: number, actor: Actor, mediaType?: MediaType) {
        const collections = await this.repository.getUserCollections(targetUserId, actor, mediaType);
        return this._enrichWithPreviews(collections, actor);
    }

    async getPaginatedUserCollections(targetUserId: number, params: Omit<UserCollectionsSearch, "username">, actor: Actor) {
        const paginatedCollections = await this.repository.getPaginatedUserCollections(targetUserId, actor, params);
        const results = await this._enrichWithPreviews(paginatedCollections.items, actor);

        return {
            ...paginatedCollections,
            items: results,
        };
    }

    async getPublicCollections(params: CommunitySearch, actor: Actor) {
        const paginatedCollections = await this.repository.getPublicCollections(params);
        const results = await this._enrichWithPreviews(paginatedCollections.items, actor);

        return {
            ...paginatedCollections,
            items: results,
        };
    }

    async getMediaCommunityCollections(mediaId: number, mediaType: MediaType, actor: Actor) {
        const collections = await this.repository.getMediaCommunityCollections(mediaId, mediaType);
        return this._enrichWithPreviews(collections, actor);
    }

    async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        return this.repository.getUserCollectionMemberships(ownerId, mediaId, mediaType);
    }

    addMediaToCollection(params: { actor: Actor; mediaId: number; mediaType: MediaType; collectionId: number }) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(params.collectionId);
            if (!collection) {
                throw new FormattedError("Unauthorized to update this collection.");
            }

            this._assertAction(collection, params.actor, "addItem", "Unauthorized to update this collection.");

            const nextOrderIndex = this.repository.getMaxCollectionItemOrder(params.collectionId) + 1;
            this.repository.insertCollectionItem({
                annotation: null,
                mediaId: params.mediaId,
                orderIndex: nextOrderIndex,
                mediaType: params.mediaType,
                collectionId: params.collectionId,
            });
        });
    }

    removeMediaFromCollection(params: { actor: Actor; mediaId: number; mediaType: MediaType; collectionId: number }) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(params.collectionId);
            if (!collection) {
                throw new FormattedError("Unauthorized to update this collection.");
            }

            this._assertAction(collection, params.actor, "removeItem", "Unauthorized to update this collection.");

            if (collection.itemsCount <= 1) {
                throw new FormattedError("A collection must contain at least one item.");
            }

            this.repository.deleteCollectionItem(params.collectionId, params.mediaId, params.mediaType);
        });
    }

    createCollection(params: {
        title: string;
        ownerId: number;
        ordered: boolean;
        privacy: PrivacyType;
        description?: string | null;
        items: CollectionItemInput[];
    }) {
        return withTransaction(() => {
            const { items, ...collectionData } = params;
            const uniqueItems = uniqueBy(items, toItemKey);

            const collectionId = this.repository.createCollection({ ...collectionData });
            this.repository.replaceCollectionItems(collectionId, uniqueItems.map((item, index) => ({
                collectionId,
                mediaId: item.mediaId,
                orderIndex: index + 1,
                mediaType: item.mediaType,
                annotation: item.annotation ?? null,
            })));

            return collectionId;
        });
    }

    updateCollection(params: {
        actor: Actor;
        title: string;
        ordered: boolean;
        privacy: PrivacyType;
        collectionId: number;
        description?: string | null;
        items: CollectionItemInput[];
    }) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(params.collectionId);
            if (!collection) throw notFound();

            this._assertAction(collection, params.actor, "edit", "Unauthorized to update this collection.");

            const uniqueItems = uniqueBy(params.items, toItemKey);
            this.repository.updateCollection(params.collectionId, {
                title: params.title,
                privacy: params.privacy,
                ordered: params.ordered,
                description: params.description ?? null,
            });

            this.repository.replaceCollectionItems(params.collectionId, uniqueItems.map((item, index) => ({
                mediaId: item.mediaId,
                orderIndex: index + 1,
                mediaType: item.mediaType,
                collectionId: params.collectionId,
                annotation: item.annotation ?? null,
            })));
        });
    }

    deleteCollection(collectionId: number, actor: Actor) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(collectionId);
            if (!collection) throw notFound();

            this._assertAction(collection, actor, "delete", "Unauthorized to delete this collection.");

            this.repository.deleteCollection(collectionId);
        });
    }

    toggleLike(collectionId: number, actor: Actor) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(collectionId);
            if (!collection) throw notFound();
            if (actor.kind === "anonymous") throw new FormattedError("Unauthorized to like this collection.");

            const decision = this.authorizationService.decideCollection(actor, "like", collection);
            if (!decision.allowed) throw new UnauthorizedError("private");

            const existingLike = this.repository.findLikedCollection(actor.id, collectionId);
            if (existingLike) {
                this.repository.deleteLike(existingLike.id);
                this.repository.decrementLikeCount(collectionId);
            }
            else {
                this.repository.insertLike(actor.id, collectionId);
                this.repository.incrementLikeCount(collectionId);
            }
        });
    }

    copyCollection(collectionId: number, actor: Actor) {
        return withTransaction(() => {
            const collection = this.repository.getCollectionById(collectionId);
            if (!collection) throw notFound();
            if (actor.kind === "anonymous") throw new FormattedError("Unauthorized to copy this collection.");

            const decision = this.authorizationService.decideCollection(actor, "copy", collection);
            if (!decision.allowed) throw new UnauthorizedError("private");

            const items = this.repository.getCollectionItems(collectionId);
            const createdId = this.repository.createCollection({
                ownerId: actor.id,
                ordered: collection.ordered,
                privacy: PrivacyType.PRIVATE,
                description: collection.description,
                title: `Copy of ${collection.title}`,
            });

            if (items.length > 0) {
                this.repository.replaceCollectionItems(createdId, items.map((item) => ({
                    mediaId: item.mediaId,
                    collectionId: createdId,
                    mediaType: item.mediaType,
                    annotation: item.annotation,
                    orderIndex: item.orderIndex,
                })));
            }

            this.repository.incrementCopyCount(collectionId);

            return { id: createdId };
        });
    }

    private async _getMediaLookup(items: CollectionItemInput[], viewerId?: number) {
        const idsByType = new Map<MediaType, Set<number>>();
        for (const item of items) {
            const ids = idsByType.get(item.mediaType) ?? new Set<number>();
            ids.add(item.mediaId);
            idsByType.set(item.mediaType, ids);
        }

        const mediaLookup = new Map<string, MediaInfo>();
        await Promise.all([...idsByType.entries()].map(async ([mediaType, ids]) => {
            const mediaDetails = await this.mediaRegistry.get(mediaType).getMediaDetailsByIds([...ids], viewerId);
            for (const media of mediaDetails) {
                mediaLookup.set(toItemKey({ mediaType, mediaId: media.id }), media);
            }
        }));

        return mediaLookup;
    }

    private async _enrichWithPreviews(collections: Awaited<ReturnType<typeof CollectionsRepository.getUserCollections>>, actor: Actor) {
        if (collections.length === 0) return [];

        const mediaLookup = await this._getMediaLookup(collections.flatMap(collection => collection.previewItems));

        return collections.map((collection) => {
            const policyCapabilities = collectionPolicy.capabilities(actor, collection);

            return {
                ...collection,
                capabilities: {
                    edit: policyCapabilities.edit,
                    delete: policyCapabilities.delete,
                },
                previews: collection.previewItems.map((item) => {
                    const media = mediaLookup.get(toItemKey(item));
                    if (!media) return null;

                    return {
                        mediaId: media.id,
                        mediaName: media.name,
                        mediaType: item.mediaType,
                        releaseDate: media.releaseDate,
                        mediaCover: getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, media.imageCover),
                    };
                }).filter((item): item is NonNullable<typeof item> => item !== null),
            };
        });
    }

    private _assertAction(collection: Parameters<typeof collectionPolicy.decide>[2], actor: Actor, action: CollectionAction, message: string) {
        if (!collectionPolicy.decide(actor, action, collection).allowed) {
            throw new FormattedError(message);
        }
    }
}
