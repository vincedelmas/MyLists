import {notFound} from "@tanstack/react-router";
import {CollectionItemInput} from "@/lib/types/collections.types";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {MediaType, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {decideCollectionAccess} from "@/lib/server/domain/access/collection-access.policy";
import {SocialGraphReadService} from "@/lib/server/domain/social/social-graph-read.service";
import {EditorialCollectionsReadRepository} from "@/lib/server/domain/collections/editorial-collections-read.repository";
import {EditorialCollectionsWriteRepository} from "@/lib/server/domain/collections/editorial-collections-write.repository";


export class EditorialCollectionsCommandService {
    constructor(
        private readonly reads = new EditorialCollectionsReadRepository(),
        private readonly writes = new EditorialCollectionsWriteRepository(),
        private readonly social = new SocialGraphReadService(),
    ) {}

    async create(params: {
        ownerId: number;
        title: string;
        description?: string | null;
        mediaType: MediaType;
        privacy: PrivacyType;
        ordered: boolean;
        items: CollectionItemInput[];
    }) {
        const items = this.normalizeItems(params.items);
        const created = await this.writes.createCollection({
            ownerId: params.ownerId,
            title: params.title,
            description: params.description,
            kind: params.mediaType,
            visibility: params.privacy,
            ordered: params.ordered,
        });
        await this.writes.replaceItems(created.id, params.mediaType, items);
        return created.id;
    }

    async update(params: {
        actorId: number;
        actorRole?: RoleType | null;
        collectionId: number;
        title: string;
        description?: string | null;
        privacy: PrivacyType;
        ordered: boolean;
        items: CollectionItemInput[];
    }) {
        const collection = await this.requireManage(params.collectionId, params.actorId, params.actorRole);
        await this.writes.updateCollection(params.collectionId, {
            title: params.title,
            description: params.description,
            visibility: params.privacy,
            ordered: params.ordered,
        });
        await this.writes.replaceItems(params.collectionId, collection.mediaType, this.normalizeItems(params.items));
    }

    async addItem(params: { actorId: number; collectionId: number; mediaId: number; mediaType: MediaType }) {
        const collection = await this.requireOwner(params.collectionId, params.actorId, params.mediaType);
        await this.writes.addItem(collection.id, collection.mediaType, params.mediaId);
    }

    async removeItem(params: { actorId: number; collectionId: number; mediaId: number; mediaType: MediaType }) {
        const collection = await this.requireOwner(params.collectionId, params.actorId, params.mediaType);
        if (collection.itemsCount <= 1) throw new FormattedError("A collection must contain at least one item.");
        await this.writes.removeItem(collection.id, collection.mediaType, params.mediaId);
    }

    async delete(collectionId: number, actorId: number, actorRole?: RoleType | null) {
        await this.requireManage(collectionId, actorId, actorRole);
        await this.writes.deleteCollection(collectionId);
    }

    async toggleLike(collectionId: number, actorId: number) {
        const collection = await this.requireVisible(collectionId, actorId);
        return this.writes.toggleLike(collection.id, actorId);
    }

    async copy(collectionId: number, actorId: number) {
        const collection = await this.requireVisible(collectionId, actorId);
        const items = await this.reads.getCollectionItems(collectionId);
        const created = await this.writes.createCollection({
            ownerId: actorId,
            title: `Copy of ${collection.title}`,
            description: collection.description,
            kind: collection.mediaType,
            visibility: PrivacyType.PRIVATE,
            ordered: collection.ordered,
        });
        await this.writes.replaceItems(created.id, collection.mediaType, items.map((item) => ({
            mediaId: item.mediaId,
            annotation: item.annotation,
        })));
        await this.writes.incrementCopyCount(collectionId);
        return { id: created.id };
    }

    private async requireVisible(collectionId: number, actorId?: number, actorRole?: RoleType | null) {
        const collection = await this.reads.getCollectionById(collectionId);
        if (!collection) throw notFound();
        const followingStatus = actorId && collection.privacy === PrivacyType.RESTRICTED && collection.ownerPrivacy === PrivacyType.PRIVATE
            ? (await this.social.getFollowingStatus(actorId, collection.ownerId))?.status ?? null
            : null;
        const access = decideCollectionAccess(
            { ownerId: collection.ownerId, ownerPrivacy: collection.ownerPrivacy, visibility: collection.privacy },
            { id: actorId, role: actorRole, followingStatus: followingStatus as SocialState | null },
            "read",
        );
        if (!access.allowed) throw new UnauthorizedError(access.reason);
        return collection;
    }

    private async requireManage(collectionId: number, actorId: number, actorRole?: RoleType | null) {
        const collection = await this.reads.getCollectionById(collectionId);
        if (!collection) throw notFound();
        const access = decideCollectionAccess(
            { ownerId: collection.ownerId, ownerPrivacy: collection.ownerPrivacy, visibility: collection.privacy },
            { id: actorId, role: actorRole },
            "manage",
        );
        if (!access.allowed) throw new FormattedError("Unauthorized to update this collection.");
        return collection;
    }

    private async requireOwner(collectionId: number, actorId: number, mediaType: MediaType) {
        const collection = await this.reads.getCollectionById(collectionId);
        if (!collection || collection.ownerId !== actorId || collection.mediaType !== mediaType) {
            throw new FormattedError("Unauthorized to update this collection.");
        }
        return collection;
    }

    private normalizeItems(items: CollectionItemInput[]) {
        const seen = new Set<number>();
        return items.filter(({ mediaId }) => {
            if (seen.has(mediaId)) return false;
            seen.add(mediaId);
            return true;
        });
    }
}
