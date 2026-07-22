import {notFound} from "@tanstack/react-router";
import {UserService} from "@/lib/server/domain/user";
import {MediaInfo} from "@/lib/types/activity.types";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {AssertCollection, CollectionItemInput} from "@/lib/types/collections.types";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {isAtLeastRole, MediaType, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";


export class CollectionsService {
    constructor(
        private userService: UserService,
        private repository: typeof CollectionsRepository,
        private mediaRegistry: MediaServiceRegistry,
    ) {
    }

    async getCollectionDetails(collectionId: number, mode: "read" | "edit", actorId?: number, actorRole?: RoleType | null) {
        const collection = await this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();

        const isOwner = (actorId === collection.ownerId);
        const isModerator = isAtLeastRole(actorRole, RoleType.MANAGER);

        if (mode === "edit") {
            if (!isOwner && !isModerator) {
                throw new UnauthorizedError("private");
            }
        }
        else {
            await this._assertVisible(collection, isOwner, isModerator, actorId);
        }

        const [items, isLiked] = await Promise.all([
            this.repository.getCollectionItems(collectionId),
            actorId ? this.repository.findLikedCollection(actorId, collectionId) : Promise.resolve(null),
            this.repository.incrementViewCount(collectionId),
        ]);

        const mediaService = this.mediaRegistry.get(collection.mediaType);
        const mediaRows = await mediaService.getMediaDetailsByIds(items.map((item) => item.mediaId), actorId);
        const mediaMap = new Map(mediaRows.map((m) => [m.id, m]));

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
            collection,
            isLiked: !!isLiked,
            items: detailedItems,
            canManage: isOwner || isModerator,
        };
    }

    async getUserCollections(targetUserId: number, actorId?: number, mediaType?: MediaType, actorRole?: RoleType | null) {
        const isOwner = (actorId === targetUserId);
        const canViewPrivate = isOwner || isAtLeastRole(actorRole, RoleType.ADMIN);
        const collections = await this.repository.getUserCollections(targetUserId, canViewPrivate, mediaType);

        return this._enrichWithPreviews(collections);
    }

    async getPaginatedUserCollections(targetUserId: number, params: Omit<UserCollectionsSearch, "username">, actorId?: number, actorRole?: RoleType | null) {
        const isOwner = (actorId === targetUserId);
        const canViewPrivate = isOwner || isAtLeastRole(actorRole, RoleType.ADMIN);

        const paginatedCollections = await this.repository.getPaginatedUserCollections(targetUserId, canViewPrivate, params);
        const results = await this._enrichWithPreviews(paginatedCollections.items);

        return {
            ...paginatedCollections,
            items: results,
        };
    }

    async getPublicCollections(params: CommunitySearch) {
        const paginatedCollections = await this.repository.getPublicCollections(params);
        const results = await this._enrichWithPreviews(paginatedCollections.items);

        return {
            ...paginatedCollections,
            items: results,
        };
    }

    async getMediaCommunityCollections(mediaId: number, mediaType: MediaType) {
        const collections = await this.repository.getMediaCommunityCollections(mediaId, mediaType);
        return this._enrichWithPreviews(collections);
    }

    async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        return this.repository.getUserCollectionMemberships(ownerId, mediaId, mediaType);
    }

    async addMediaToCollection(params: { actorId: number; mediaId: number; mediaType: MediaType; collectionId: number }) {
        const collection = await this.repository.getCollectionById(params.collectionId);
        if (!collection || collection.ownerId !== params.actorId || collection.mediaType !== params.mediaType) {
            throw new FormattedError("Unauthorized to update this collection.");
        }

        const nextOrderIndex = await this.repository.getMaxCollectionItemOrder(params.collectionId) + 1;
        await this.repository.insertCollectionItem({
            annotation: null,
            mediaId: params.mediaId,
            orderIndex: nextOrderIndex,
            mediaType: params.mediaType,
            collectionId: params.collectionId,
        });
    }

    async removeMediaFromCollection(params: { actorId: number; mediaId: number; mediaType: MediaType; collectionId: number }) {
        const collection = await this.repository.getCollectionById(params.collectionId);
        if (!collection || collection.ownerId !== params.actorId || collection.mediaType !== params.mediaType) {
            throw new FormattedError("Unauthorized to update this collection.");
        }

        if (collection.itemsCount <= 1) {
            throw new FormattedError("A collection must contain at least one item.");
        }

        await this.repository.deleteCollectionItem(params.collectionId, params.mediaId);
    }

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
        const uniqueItems = this._normalizeItems(items);

        const collectionId = await this.repository.createCollection({ ...collectionData });
        await this.repository.replaceCollectionItems(collectionId, uniqueItems.map((item, index) => ({
            collectionId,
            mediaId: item.mediaId,
            orderIndex: index + 1,
            mediaType: params.mediaType,
            annotation: item.annotation ?? null,
        })));

        return collectionId;
    }

    async updateCollection(params: {
        title: string;
        actorId: number;
        ordered: boolean;
        privacy: PrivacyType;
        collectionId: number;
        description?: string | null;
        actorRole?: RoleType | null;
        items: CollectionItemInput[];
    }) {
        const collection = await this.repository.getCollectionById(params.collectionId);
        if (!collection) throw notFound();

        const isOwner = (collection.ownerId === params.actorId);
        const isModerator = isAtLeastRole(params.actorRole, RoleType.MANAGER);
        if (!isOwner && !isModerator) {
            throw new FormattedError("Unauthorized to update this collection.");
        }

        const sanitizedItems = this._normalizeItems(params.items);
        await this.repository.updateCollection(params.collectionId, {
            title: params.title,
            privacy: params.privacy,
            ordered: params.ordered,
            description: params.description ?? null,
        });

        await this.repository.replaceCollectionItems(params.collectionId, sanitizedItems.map((item, index) => ({
            mediaId: item.mediaId,
            orderIndex: index + 1,
            mediaType: collection.mediaType,
            collectionId: params.collectionId,
            annotation: item.annotation ?? null,
        })));
    }

    async deleteCollection(collectionId: number, actorId: number, actorRole?: RoleType | null) {
        const collection = await this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();

        const isOwner = (collection.ownerId === actorId);
        const isModerator = isAtLeastRole(actorRole, RoleType.MANAGER);
        if (!isOwner && !isModerator) {
            throw new FormattedError("Unauthorized to delete this collection.");
        }

        await this.repository.deleteCollection(collectionId);
    }

    async toggleLike(collectionId: number, actorId: number) {
        const collection = await this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();

        const isOwner = (collection.ownerId === actorId);
        await this._assertVisible(collection, isOwner, false, actorId);

        const existingLike = await this.repository.findLikedCollection(actorId, collectionId);
        if (existingLike) {
            await this.repository.deleteLike(existingLike.id);
            await this.repository.decrementLikeCount(collectionId);
        }
        else {
            await this.repository.insertLike(actorId, collectionId);
            await this.repository.incrementLikeCount(collectionId);
        }
    }

    async copyCollection(collectionId: number, actorId: number) {
        const collection = await this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();

        const isOwner = (collection.ownerId === actorId);
        await this._assertVisible(collection, isOwner, false, actorId);

        const items = await this.repository.getCollectionItems(collectionId);
        const createdId = await this.repository.createCollection({
            ownerId: actorId,
            ordered: collection.ordered,
            privacy: PrivacyType.PRIVATE,
            mediaType: collection.mediaType,
            description: collection.description,
            title: `Copy of ${collection.title}`,
        });

        if (items.length > 0) {
            await this.repository.replaceCollectionItems(createdId, items.map((item) => ({
                mediaId: item.mediaId,
                collectionId: createdId,
                annotation: item.annotation,
                orderIndex: item.orderIndex,
                mediaType: collection.mediaType,
            })));
        }

        await this.repository.incrementCopyCount(collectionId);

        return { id: createdId };
    }

    private _normalizeItems(items: CollectionItemInput[]) {
        const seen = new Set<number>();
        return items.filter((item) => {
            if (seen.has(item.mediaId)) return false;
            seen.add(item.mediaId);
            return true;
        });
    }

    private async _enrichWithPreviews(collections: Awaited<ReturnType<typeof CollectionsRepository.getUserCollections>>) {
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
            const mediaService = this.mediaRegistry.get(mediaType);
            const mediaDetails = await mediaService.getMediaDetailsByIds([...ids]);
            mediaDetails.forEach((media) => mediaLookup.set(`${mediaType}-${media.id}`, media));
        }));

        return collections.map((collection) => ({
            ...collection,
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
        }));
    }

    private async _assertVisible(collection: AssertCollection, isOwner: boolean, isModerator: boolean, actorId?: number) {
        // Owners and moderators have instant access
        if (isOwner || isModerator) return;

        // Private collections are strictly for owners
        if (collection.privacy === PrivacyType.PRIVATE) {
            throw new UnauthorizedError("private");
        }

        // Handle non-authed user
        if (!actorId) {
            if (collection.privacy === PrivacyType.RESTRICTED && collection.ownerPrivacy === PrivacyType.PUBLIC) {
                return;
            }

            if (collection.privacy !== PrivacyType.PUBLIC) {
                throw new UnauthorizedError(collection.ownerPrivacy === PrivacyType.RESTRICTED ? "restricted" : "private");
            }
            return;
        }

        // Handle Logged-in non-owner logic
        if (collection.privacy === PrivacyType.RESTRICTED && collection.ownerPrivacy === PrivacyType.PRIVATE) {
            const followStatus = await this.userService.getFollowingStatus(actorId, collection.ownerId);
            if (followStatus?.status !== SocialState.ACCEPTED) {
                throw new UnauthorizedError("private");
            }
        }
    }
}
