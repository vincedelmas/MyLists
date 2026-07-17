import {and, asc, count, desc, eq, inArray, like, or, sql} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    collection,
    collectionItem,
    collectionLike,
    user,
} from "@/lib/server/database/schema";


const likeCount = sql<number>`(
    SELECT COUNT(*) FROM ${collectionLike} ecl
    WHERE ecl.collection_id = ${collection.id}
)`;
const itemsCount = sql<number>`(
    SELECT COUNT(*) FROM ${collectionItem} eci
    WHERE eci.collection_id = ${collection.id}
)`;
const previewItems = sql<number[]>`(
    SELECT json_group_array(catalog_item_id)
    FROM (
        SELECT eci.catalog_item_id
        FROM ${collectionItem} eci
        WHERE eci.collection_id = ${collection.id}
        ORDER BY eci.position ASC
        LIMIT 4
    )
)`.mapWith((value) => JSON.parse(value) as number[]);


export class CollectionsReadRepository {
    async getCollectionById(collectionId: number) {
        return getDbClient().select({
            ownerName: user.name,
            ownerImage: user.image,
            ownerPrivacy: user.privacy,
            itemsCount,
            likeCount,
            id: collection.id,
            ownerId: collection.ownerId,
            title: collection.title,
            description: collection.description,
            mediaType: collection.kind,
            viewCount: collection.viewCount,
            copiedCount: collection.copiedCount,
            ordered: collection.ordered,
            privacy: collection.visibility,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
        }).from(collection)
            .innerJoin(user, eq(user.id, collection.ownerId))
            .where(eq(collection.id, collectionId)).get();
    }

    getCollectionItems(collectionId: number) {
        return getDbClient().select({
            collectionId: collectionItem.collectionId,
            catalogItemId: collectionItem.catalogItemId,
            mediaId: collectionItem.catalogItemId,
            mediaType: collection.kind,
            annotation: collectionItem.annotation,
            orderIndex: collectionItem.position,
            createdAt: collectionItem.createdAt,
        }).from(collectionItem)
            .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
            .where(eq(collectionItem.collectionId, collectionId))
            .orderBy(asc(collectionItem.position));
    }

    async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        const matchingItem = alias(collectionItem, "matching_collection_item");
        return getDbClient().select({
            id: collection.id,
            title: collection.title,
            privacy: collection.visibility,
            ordered: collection.ordered,
            hasMedia: sql<boolean>`CASE WHEN ${matchingItem.catalogItemId} IS NULL THEN 0 ELSE 1 END`.mapWith(Boolean),
            itemsCount,
        }).from(collection)
            .leftJoin(matchingItem, and(
                eq(matchingItem.collectionId, collection.id),
                eq(matchingItem.catalogItemId, mediaId),
            ))
            .where(and(eq(collection.ownerId, ownerId), eq(collection.kind, mediaType)))
            .orderBy(asc(collection.title));
    }

    getUserCollections(targetUserId: number, visibleTypes: PrivacyType[] | undefined, mediaType?: MediaType) {
        return getDbClient().select({
            ownerName: user.name,
            ownerImage: user.image,
            itemsCount,
            previewItems,
            likeCount,
            ...collectionFields(),
        }).from(collection)
            .innerJoin(user, eq(user.id, collection.ownerId))
            .where(and(
                eq(collection.ownerId, targetUserId),
                mediaType ? eq(collection.kind, mediaType) : undefined,
                visibleTypes ? inArray(collection.visibility, visibleTypes) : undefined,
            ))
            .orderBy(desc(likeCount), asc(collection.id));
    }

    getPaginatedUserCollections(targetUserId: number, visibleTypes: PrivacyType[] | undefined, params: Omit<UserCollectionsSearch, "username">) {
        const searchFilter = params.search?.trim();
        const conditions = and(
            searchFilter ? like(collection.title, `%${searchFilter}%`) : undefined,
            visibleTypes ? inArray(collection.visibility, visibleTypes) : undefined,
            eq(collection.ownerId, targetUserId),
            params.mediaType ? eq(collection.kind, params.mediaType) : undefined,
        );
        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => getDbClient().select({ count: count() }).from(collection)
                .where(conditions).get()?.count ?? 0,
            getItems: ({ limit, offset }) => getDbClient().select({
                ownerName: user.name,
                ownerImage: user.image,
                itemsCount,
                previewItems,
                likeCount,
                ...collectionFields(),
            }).from(collection)
                .innerJoin(user, eq(user.id, collection.ownerId))
                .where(conditions)
                .orderBy(desc(likeCount), asc(collection.id))
                .limit(limit).offset(offset),
        });
    }

    getPublicCollections(params: CommunitySearch) {
        const searchFilter = params.search?.trim();
        const searchCondition = searchFilter ? or(
            like(user.name, `%${searchFilter}%`),
            like(collection.title, `%${searchFilter}%`),
            like(collection.description, `%${searchFilter}%`),
        ) : undefined;
        const conditions = and(
            eq(collection.visibility, PrivacyType.PUBLIC),
            params.mediaType ? eq(collection.kind, params.mediaType) : undefined,
            searchCondition,
        );
        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => getDbClient().select({ count: count() }).from(collection)
                .innerJoin(user, eq(user.id, collection.ownerId))
                .where(conditions).get()?.count ?? 0,
            getItems: ({ limit, offset }) => getDbClient().select({
                ownerName: user.name,
                ownerImage: user.image,
                itemsCount,
                previewItems,
                likeCount,
                ...collectionFields(),
            }).from(collection)
                .innerJoin(user, eq(user.id, collection.ownerId))
                .where(conditions)
                .orderBy(desc(likeCount), asc(collection.id))
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
        }).from(collection)
            .innerJoin(user, eq(user.id, collection.ownerId))
            .innerJoin(collectionItem, and(
                eq(collectionItem.collectionId, collection.id),
                eq(collectionItem.catalogItemId, mediaId),
            ))
            .where(and(
                eq(collection.visibility, PrivacyType.PUBLIC),
                eq(collection.kind, mediaType),
            ))
            .orderBy(desc(likeCount), asc(collection.id))
            .limit(6);
    }

    findLikedCollection(userId: number, collectionId: number) {
        return getDbClient().select().from(collectionLike).where(and(
            eq(collectionLike.userId, userId),
            eq(collectionLike.collectionId, collectionId),
        )).get();
    }

}


const collectionFields = () => ({
    id: collection.id,
    ownerId: collection.ownerId,
    title: collection.title,
    description: collection.description,
    mediaType: collection.kind,
    viewCount: collection.viewCount,
    copiedCount: collection.copiedCount,
    ordered: collection.ordered,
    privacy: collection.visibility,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
});
