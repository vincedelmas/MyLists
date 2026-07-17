import {and, asc, count, desc, eq, inArray, like, or, sql} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    editorialCollection,
    editorialCollectionItem,
    editorialCollectionLike,
    user,
} from "@/lib/server/database/schema";


const likeCount = sql<number>`(
    SELECT COUNT(*) FROM ${editorialCollectionLike} ecl
    WHERE ecl.collection_id = ${editorialCollection.id}
)`;
const itemsCount = sql<number>`(
    SELECT COUNT(*) FROM ${editorialCollectionItem} eci
    WHERE eci.collection_id = ${editorialCollection.id}
)`;
const previewItems = sql<number[]>`(
    SELECT json_group_array(catalog_item_id)
    FROM (
        SELECT eci.catalog_item_id
        FROM ${editorialCollectionItem} eci
        WHERE eci.collection_id = ${editorialCollection.id}
        ORDER BY eci.position ASC
        LIMIT 4
    )
)`.mapWith((value) => JSON.parse(value) as number[]);


export class EditorialCollectionsReadRepository {
    async getCollectionById(collectionId: number) {
        return getDbClient().select({
            ownerName: user.name,
            ownerImage: user.image,
            ownerPrivacy: user.privacy,
            itemsCount,
            likeCount,
            id: editorialCollection.id,
            ownerId: editorialCollection.ownerId,
            title: editorialCollection.title,
            description: editorialCollection.description,
            mediaType: editorialCollection.kind,
            viewCount: editorialCollection.viewCount,
            copiedCount: editorialCollection.copiedCount,
            ordered: editorialCollection.ordered,
            privacy: editorialCollection.visibility,
            createdAt: editorialCollection.createdAt,
            updatedAt: editorialCollection.updatedAt,
        }).from(editorialCollection)
            .innerJoin(user, eq(user.id, editorialCollection.ownerId))
            .where(eq(editorialCollection.id, collectionId)).get();
    }

    getCollectionItems(collectionId: number) {
        return getDbClient().select({
            collectionId: editorialCollectionItem.collectionId,
            catalogItemId: editorialCollectionItem.catalogItemId,
            mediaId: editorialCollectionItem.catalogItemId,
            mediaType: editorialCollection.kind,
            annotation: editorialCollectionItem.annotation,
            orderIndex: editorialCollectionItem.position,
            createdAt: editorialCollectionItem.createdAt,
        }).from(editorialCollectionItem)
            .innerJoin(editorialCollection, eq(editorialCollection.id, editorialCollectionItem.collectionId))
            .where(eq(editorialCollectionItem.collectionId, collectionId))
            .orderBy(asc(editorialCollectionItem.position));
    }

    async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        const matchingItem = alias(editorialCollectionItem, "matching_editorial_item");
        return getDbClient().select({
            id: editorialCollection.id,
            title: editorialCollection.title,
            privacy: editorialCollection.visibility,
            ordered: editorialCollection.ordered,
            hasMedia: sql<boolean>`CASE WHEN ${matchingItem.catalogItemId} IS NULL THEN 0 ELSE 1 END`.mapWith(Boolean),
            itemsCount,
        }).from(editorialCollection)
            .leftJoin(matchingItem, and(
                eq(matchingItem.collectionId, editorialCollection.id),
                eq(matchingItem.catalogItemId, mediaId),
            ))
            .where(and(eq(editorialCollection.ownerId, ownerId), eq(editorialCollection.kind, mediaType)))
            .orderBy(asc(editorialCollection.title));
    }

    getUserCollections(targetUserId: number, visibleTypes: PrivacyType[] | undefined, mediaType?: MediaType) {
        return getDbClient().select({
            ownerName: user.name,
            ownerImage: user.image,
            itemsCount,
            previewItems,
            likeCount,
            ...collectionFields(),
        }).from(editorialCollection)
            .innerJoin(user, eq(user.id, editorialCollection.ownerId))
            .where(and(
                eq(editorialCollection.ownerId, targetUserId),
                mediaType ? eq(editorialCollection.kind, mediaType) : undefined,
                visibleTypes ? inArray(editorialCollection.visibility, visibleTypes) : undefined,
            ))
            .orderBy(desc(likeCount), asc(editorialCollection.id));
    }

    getPaginatedUserCollections(targetUserId: number, visibleTypes: PrivacyType[] | undefined, params: Omit<UserCollectionsSearch, "username">) {
        const searchFilter = params.search?.trim();
        const conditions = and(
            searchFilter ? like(editorialCollection.title, `%${searchFilter}%`) : undefined,
            visibleTypes ? inArray(editorialCollection.visibility, visibleTypes) : undefined,
            eq(editorialCollection.ownerId, targetUserId),
            params.mediaType ? eq(editorialCollection.kind, params.mediaType) : undefined,
        );
        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => getDbClient().select({ count: count() }).from(editorialCollection)
                .where(conditions).get()?.count ?? 0,
            getItems: ({ limit, offset }) => getDbClient().select({
                ownerName: user.name,
                ownerImage: user.image,
                itemsCount,
                previewItems,
                likeCount,
                ...collectionFields(),
            }).from(editorialCollection)
                .innerJoin(user, eq(user.id, editorialCollection.ownerId))
                .where(conditions)
                .orderBy(desc(likeCount), asc(editorialCollection.id))
                .limit(limit).offset(offset),
        });
    }

    getPublicCollections(params: CommunitySearch) {
        const searchFilter = params.search?.trim();
        const searchCondition = searchFilter ? or(
            like(user.name, `%${searchFilter}%`),
            like(editorialCollection.title, `%${searchFilter}%`),
            like(editorialCollection.description, `%${searchFilter}%`),
        ) : undefined;
        const conditions = and(
            eq(editorialCollection.visibility, PrivacyType.PUBLIC),
            params.mediaType ? eq(editorialCollection.kind, params.mediaType) : undefined,
            searchCondition,
        );
        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => getDbClient().select({ count: count() }).from(editorialCollection)
                .innerJoin(user, eq(user.id, editorialCollection.ownerId))
                .where(conditions).get()?.count ?? 0,
            getItems: ({ limit, offset }) => getDbClient().select({
                ownerName: user.name,
                ownerImage: user.image,
                itemsCount,
                previewItems,
                likeCount,
                ...collectionFields(),
            }).from(editorialCollection)
                .innerJoin(user, eq(user.id, editorialCollection.ownerId))
                .where(conditions)
                .orderBy(desc(likeCount), asc(editorialCollection.id))
                .limit(limit).offset(offset),
        });
    }

    getMediaCommunityCollections(mediaId: number, mediaType: MediaType) {
        return getDbClient().select({
            ownerName: user.name,
            ownerImage: user.image,
            itemsCount,
            previewItems,
            likeCount,
            ...collectionFields(),
        }).from(editorialCollection)
            .innerJoin(user, eq(user.id, editorialCollection.ownerId))
            .innerJoin(editorialCollectionItem, and(
                eq(editorialCollectionItem.collectionId, editorialCollection.id),
                eq(editorialCollectionItem.catalogItemId, mediaId),
            ))
            .where(and(
                eq(editorialCollection.visibility, PrivacyType.PUBLIC),
                eq(editorialCollection.kind, mediaType),
            ))
            .orderBy(desc(likeCount), asc(editorialCollection.id))
            .limit(6);
    }

    findLikedCollection(userId: number, collectionId: number) {
        return getDbClient().select().from(editorialCollectionLike).where(and(
            eq(editorialCollectionLike.userId, userId),
            eq(editorialCollectionLike.collectionId, collectionId),
        )).get();
    }

}


const collectionFields = () => ({
    id: editorialCollection.id,
    ownerId: editorialCollection.ownerId,
    title: editorialCollection.title,
    description: editorialCollection.description,
    mediaType: editorialCollection.kind,
    viewCount: editorialCollection.viewCount,
    copiedCount: editorialCollection.copiedCount,
    ordered: editorialCollection.ordered,
    privacy: editorialCollection.visibility,
    createdAt: editorialCollection.createdAt,
    updatedAt: editorialCollection.updatedAt,
});
