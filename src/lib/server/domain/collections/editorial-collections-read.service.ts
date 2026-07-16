import {notFound} from "@tanstack/react-router";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {isAtLeastRole, MediaType, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {decideCollectionAccess} from "@/lib/server/domain/access/collection-access.policy";
import {CollectionCatalogCardRepository} from "@/lib/server/domain/collections/collection-catalog-card.repository";
import {EditorialCollectionsReadRepository} from "@/lib/server/domain/collections/editorial-collections-read.repository";
import {SocialGraphReadService} from "@/lib/server/domain/social/social-graph-read.service";


export class EditorialCollectionsReadService {
    constructor(
        private readonly social = new SocialGraphReadService(),
        private readonly repository = new EditorialCollectionsReadRepository(),
        private readonly cards = new CollectionCatalogCardRepository(),
    ) {}

    async getCollectionDetails(collectionId: number, mode: "read" | "edit", actorId?: number, actorRole?: RoleType | null) {
        const collection = await this.repository.getCollectionById(collectionId);
        if (!collection) throw notFound();
        const followingStatus = actorId && collection.privacy === "restricted" && collection.ownerPrivacy === "private"
            ? (await this.social.getFollowingStatus(actorId, collection.ownerId))?.status ?? null
            : null;
        const readAccess = decideCollectionAccess(
            { ownerId: collection.ownerId, ownerPrivacy: collection.ownerPrivacy, visibility: collection.privacy },
            { id: actorId, role: actorRole, followingStatus },
            mode === "edit" ? "manage" : "read",
        );
        if (!readAccess.allowed) throw new UnauthorizedError(readAccess.reason);
        const manageAccess = decideCollectionAccess(
            { ownerId: collection.ownerId, ownerPrivacy: collection.ownerPrivacy, visibility: collection.privacy },
            { id: actorId, role: actorRole },
            "manage",
        );
        const [items, isLiked] = await Promise.all([
            this.repository.getCollectionItems(collectionId),
            actorId ? this.repository.findLikedCollection(actorId, collectionId) : Promise.resolve(undefined),
            this.repository.incrementViewCount(collectionId),
        ]);
        const mediaRows = await this.cards.findByCatalogItemIds(items.map(({ catalogItemId }) => catalogItemId), actorId);
        const mediaByCatalogId = new Map(mediaRows.map((media) => [media.catalogItemId, media]));
        return {
            collection,
            isLiked: !!isLiked,
            canManage: manageAccess.allowed,
            items: items.flatMap((item) => {
                const media = mediaByCatalogId.get(item.catalogItemId);
                return media ? [{
                    mediaId: media.id,
                    mediaName: media.name,
                    orderIndex: item.orderIndex,
                    annotation: item.annotation,
                    mediaCover: media.imageCover,
                    inUserList: Boolean(media.inUserList),
                    releaseDate: media.releaseDate,
                }] : [];
            }),
        };
    }

    async getUserCollections(targetUserId: number, ownerPrivacy: PrivacyType, actorId?: number, mediaType?: MediaType, actorRole?: RoleType | null) {
        const visibleTypes = await this.getVisibleTypes(targetUserId, ownerPrivacy, actorId, actorRole);
        return this.enrichWithPreviews(await this.repository.getUserCollections(targetUserId, visibleTypes, mediaType));
    }

    async getPaginatedUserCollections(targetUserId: number, ownerPrivacy: PrivacyType, params: Omit<UserCollectionsSearch, "username">, actorId?: number, actorRole?: RoleType | null) {
        const visibleTypes = await this.getVisibleTypes(targetUserId, ownerPrivacy, actorId, actorRole);
        const result = await this.repository.getPaginatedUserCollections(targetUserId, visibleTypes, params);
        return { ...result, items: await this.enrichWithPreviews(result.items) };
    }

    async getPublicCollections(params: CommunitySearch) {
        const result = await this.repository.getPublicCollections(params);
        return { ...result, items: await this.enrichWithPreviews(result.items) };
    }

    async getMediaCommunityCollections(mediaId: number, mediaType: MediaType) {
        return this.enrichWithPreviews(await this.repository.getMediaCommunityCollections(mediaId, mediaType));
    }

    getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        return this.repository.getUserCollectionMemberships(ownerId, mediaId, mediaType);
    }

    private async getVisibleTypes(ownerId: number, ownerPrivacy: PrivacyType, actorId?: number, actorRole?: RoleType | null) {
        if (actorId === ownerId || isAtLeastRole(actorRole, RoleType.MANAGER)) return undefined;

        const visibleTypes: PrivacyType[] = [PrivacyType.PUBLIC];
        if (ownerPrivacy === PrivacyType.PUBLIC || (ownerPrivacy === PrivacyType.RESTRICTED && actorId !== undefined)) {
            visibleTypes.push(PrivacyType.RESTRICTED);
        }
        else if (ownerPrivacy === PrivacyType.PRIVATE && actorId !== undefined) {
            const following = await this.social.getFollowingStatus(actorId, ownerId);
            if (following?.status === SocialState.ACCEPTED) visibleTypes.push(PrivacyType.RESTRICTED);
        }
        return visibleTypes;
    }

    private async enrichWithPreviews(collections: Awaited<ReturnType<EditorialCollectionsReadRepository["getUserCollections"]>>) {
        if (collections.length === 0) return [];
        const catalogIdsByPreviewKey = new Map<string, number>();
        const catalogItemIds = new Set<number>();
        for (const collection of collections) {
            const items = await this.repository.getCollectionItems(collection.id);
            for (const item of items.slice(0, 4)) {
                catalogIdsByPreviewKey.set(`${collection.mediaType}:${item.mediaId}`, item.catalogItemId);
                catalogItemIds.add(item.catalogItemId);
            }
        }
        const cards = await this.cards.findByCatalogItemIds([...catalogItemIds]);
        const cardByCatalogId = new Map(cards.map((card) => [card.catalogItemId, card]));
        return collections.map((collection) => ({
            ...collection,
            previews: collection.previewItems.flatMap((mediaId) => {
                const catalogItemId = catalogIdsByPreviewKey.get(`${collection.mediaType}:${mediaId}`);
                const media = catalogItemId ? cardByCatalogId.get(catalogItemId) : undefined;
                return media ? [{
                    mediaId: media.id,
                    mediaName: media.name,
                    mediaCover: media.imageCover,
                    releaseDate: media.releaseDate,
                }] : [];
            }),
        }));
    }
}
