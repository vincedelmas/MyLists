import {alias} from "drizzle-orm/sqlite-core";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {Actor, profileCollectionVisibilityCondition} from "@/lib/server/authorization";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {collectionItems, collectionLikes, collections, user} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, inArray, like, max, or, sql} from "drizzle-orm";


export class CollectionsRepository {
    static createCollection(values: typeof collections.$inferInsert) {
        const collection = getDbClient()
            .insert(collections)
            .values(values)
            .returning({ id: collections.id })
            .get();

        return collection.id;
    }

    static updateCollection(collectionId: number, values: Partial<typeof collections.$inferInsert>) {
        getDbClient()
            .update(collections)
            .set({
                ...values,
                updatedAt: sql`datetime('now')`,
            })
            .where(eq(collections.id, collectionId)).run();
    }

    static deleteCollection(collectionId: number) {
        const tx = getDbClient();

        tx
            .delete(collections)
            .where(eq(collections.id, collectionId)).run();
    }

    static replaceCollectionItems(collectionId: number, items: (typeof collectionItems.$inferInsert)[]) {
        if (items.length > 0) {
            this._assertMediaExists(items[0].mediaType, items.map(item => item.mediaId));
        }

        getDbClient()
            .delete(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId)).run();

        if (items.length === 0) return;

        getDbClient()
            .insert(collectionItems)
            .values(items).run();
    }

    static getCollectionById(collectionId: number) {
        return getDbClient()
            .select({
                ownerName: user.name,
                ownerImage: user.image,
                ownerPrivacy: user.privacy,
                itemsCount: sql<number>`
                    (SELECT COUNT(*) FROM ${collectionItems} ci WHERE ci.collection_id = ${collections.id})
                `.as("itemsCount"),
                ...getTableColumns(collections),
            })
            .from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .where(eq(collections.id, collectionId))
            .get();
    }

    static getCollectionItems(collectionId: number) {
        return getDbClient()
            .select()
            .from(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId))
            .orderBy(asc(collectionItems.orderIndex)).all();
    }

    static async getPaginatedCollectionItems(collectionId: number, page?: number) {
        return paginate({
            page,
            perPage: 24,
            maxPerPage: 24,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collectionItems)
                    .where(eq(collectionItems.collectionId, collectionId))
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select()
                    .from(collectionItems)
                    .where(eq(collectionItems.collectionId, collectionId))
                    .orderBy(asc(collectionItems.orderIndex))
                    .limit(limit)
                    .offset(offset);
            },
        });
    }

    static async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        const matchingItem = alias(collectionItems, "matchingItem");

        return getDbClient()
            .select({
                id: collections.id,
                title: collections.title,
                privacy: collections.privacy,
                ordered: collections.ordered,
                hasMedia: sql<boolean>`CASE WHEN ${matchingItem.id} IS NULL THEN 0 ELSE 1 END`.mapWith(Boolean).as("hasMedia"),
                itemsCount: sql<number>`(
                    SELECT COUNT(*)
                    FROM ${collectionItems} ci
                    WHERE ci.collection_id = ${collections.id}
                )`.as("itemsCount"),
            })
            .from(collections)
            .leftJoin(matchingItem, and(eq(matchingItem.collectionId, collections.id), eq(matchingItem.mediaId, mediaId)))
            .where(and(eq(collections.ownerId, ownerId), eq(collections.mediaType, mediaType)))
            .orderBy(asc(collections.title));
    }

    static getMaxCollectionItemOrder(collectionId: number) {
        return getDbClient()
            .select({ maxOrder: max(collectionItems.orderIndex) })
            .from(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId))
            .get()?.maxOrder ?? 0;
    }

    static insertCollectionItem(item: typeof collectionItems.$inferInsert) {
        this._assertMediaExists(item.mediaType, [item.mediaId]);

        getDbClient()
            .insert(collectionItems)
            .values(item)
            .onConflictDoNothing().run();
    }

    static deleteCollectionItem(collectionId: number, mediaId: number) {
        getDbClient()
            .delete(collectionItems)
            .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaId, mediaId))).run();
    }

    static async getUserCollections(targetUserId: number, actor: Actor, mediaType?: MediaType) {
        return getDbClient()
            .select({
                ownerName: user.name,
                ownerImage: user.image,
                ownerPrivacy: user.privacy,
                itemsCount: sql<number>`(
                    SELECT COUNT(*) 
                    FROM ${collectionItems} ci 
                    WHERE ci.collection_id = ${collections.id}
                )`.as("itemsCount"),
                previewItems: sql`(
                    SELECT json_group_array(media_id)
                    FROM (
                        SELECT ${collectionItems.mediaId} as media_id
                        FROM ${collectionItems}
                        WHERE ${collectionItems.collectionId} = ${collections.id}
                        ORDER BY ${collectionItems.orderIndex} ASC
                        LIMIT 4
                    )
                )`.mapWith((val) => JSON.parse(val) as number[]).as("previewItems"),
                ...getTableColumns(collections),
            })
            .from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .where(and(
                eq(collections.ownerId, targetUserId),
                mediaType ? eq(collections.mediaType, mediaType) : undefined,
                profileCollectionVisibilityCondition(actor, targetUserId),
            ))
            .orderBy(desc(collections.likeCount));
    }

    static async getPaginatedUserCollections(targetUserId: number, actor: Actor, params: Omit<UserCollectionsSearch, "username">) {
        const searchFilter = params.search?.trim();
        const searchCondition = searchFilter ? like(collections.title, `%${searchFilter}%`) : undefined;
        const visibilityCondition = profileCollectionVisibilityCondition(actor, targetUserId);

        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .where(and(
                        searchCondition,
                        visibilityCondition,
                        eq(collections.ownerId, targetUserId),
                        params.mediaType ? eq(collections.mediaType, params.mediaType) : undefined,
                    )).get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        ownerName: user.name,
                        ownerImage: user.image,
                        ownerPrivacy: user.privacy,
                        itemsCount: sql<number>`(
                            SELECT COUNT(*)
                            FROM ${collectionItems} ci
                            WHERE ci.collection_id = ${collections.id}
                        )`.as("itemsCount"),
                        previewItems: sql`(
                            SELECT json_group_array(media_id)
                            FROM (
                                SELECT ${collectionItems.mediaId} as media_id
                                FROM ${collectionItems}
                                WHERE ${collectionItems.collectionId} = ${collections.id}
                                ORDER BY ${collectionItems.orderIndex} ASC
                                LIMIT 4
                            )
                        )`.mapWith((val) => JSON.parse(val) as number[]).as("previewItems"),
                        ...getTableColumns(collections),
                    })
                    .from(collections)
                    .innerJoin(user, eq(collections.ownerId, user.id))
                    .where(and(
                        searchCondition,
                        visibilityCondition,
                        eq(collections.ownerId, targetUserId),
                        params.mediaType ? eq(collections.mediaType, params.mediaType) : undefined,
                    ))
                    .orderBy(desc(collections.likeCount))
                    .limit(limit)
                    .offset(offset);
            },
        });
    }

    static async getPublicCollections(params: CommunitySearch) {
        const searchFilter = params.search?.trim();
        const searchCondition = searchFilter ? or(
            like(user.name, `%${searchFilter}%`),
            like(collections.title, `%${searchFilter}%`),
            like(collections.description, `%${searchFilter}%`),
        ) : undefined;

        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .innerJoin(user, eq(collections.ownerId, user.id))
                    .where(and(
                        eq(collections.privacy, PrivacyType.PUBLIC),
                        params.mediaType ? eq(collections.mediaType, params.mediaType) : undefined,
                        searchCondition,
                    )).get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        ownerName: user.name,
                        ownerImage: user.image,
                        ownerPrivacy: user.privacy,
                        itemsCount: sql<number>`(
                            SELECT COUNT(*) 
                            FROM ${collectionItems} ci 
                            WHERE ci.collection_id = ${collections.id}
                        )`.as("itemsCount"),
                        previewItems: sql`(
                            SELECT json_group_array(media_id)
                            FROM (
                                SELECT ${collectionItems.mediaId} as media_id
                                FROM ${collectionItems}
                                WHERE ${collectionItems.collectionId} = ${collections.id}
                                ORDER BY ${collectionItems.orderIndex} ASC
                                LIMIT 4
                            )
                        )`.mapWith((val) => JSON.parse(val) as number[]).as("previewItems"),
                        ...getTableColumns(collections),
                    })
                    .from(collections)
                    .innerJoin(user, eq(collections.ownerId, user.id))
                    .where(and(
                        eq(collections.privacy, PrivacyType.PUBLIC),
                        params.mediaType ? eq(collections.mediaType, params.mediaType) : undefined,
                        searchCondition,
                    ))
                    .orderBy(desc(collections.likeCount))
                    .limit(limit)
                    .offset(offset);
            },
        });
    }

    static async getMediaCommunityCollections(mediaId: number, mediaType: MediaType) {
        return getDbClient()
            .select({
                ownerName: user.name,
                ownerImage: user.image,
                ownerPrivacy: user.privacy,
                itemsCount: sql<number>`(
                    SELECT COUNT(*) 
                    FROM ${collectionItems} ci 
                    WHERE ci.collection_id = ${collections.id}
                )`.as("itemsCount"),
                previewItems: sql`(
                    SELECT json_group_array(media_id)
                    FROM (
                        SELECT ${collectionItems.mediaId} as media_id
                        FROM ${collectionItems}
                        WHERE ${collectionItems.collectionId} = ${collections.id}
                        ORDER BY ${collectionItems.orderIndex} ASC
                        LIMIT 4
                    )
                )`.mapWith((val) => JSON.parse(val) as number[]).as("previewItems"),
                ...getTableColumns(collections),
            })
            .from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .innerJoin(collectionItems, and(
                eq(collectionItems.mediaId, mediaId),
                eq(collectionItems.mediaType, mediaType),
                eq(collectionItems.collectionId, collections.id),
            ))
            .where(eq(collections.privacy, PrivacyType.PUBLIC))
            .orderBy(desc(collections.likeCount))
            .limit(6);
    }

    static findLikedCollection(userId: number, collectionId: number) {
        return getDbClient()
            .select()
            .from(collectionLikes)
            .where(and(eq(collectionLikes.userId, userId), eq(collectionLikes.collectionId, collectionId)))
            .get();
    }

    static insertLike(userId: number, collectionId: number) {
        getDbClient()
            .insert(collectionLikes)
            .values({ userId, collectionId }).run();
    }

    static deleteLike(likeId: number) {
        getDbClient()
            .delete(collectionLikes)
            .where(eq(collectionLikes.id, likeId)).run();
    }

    static async incrementViewCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({ viewCount: sql`${collections.viewCount} + 1` })
            .where(eq(collections.id, collectionId));
    }

    static incrementLikeCount(collectionId: number) {
        getDbClient()
            .update(collections)
            .set({ likeCount: sql`${collections.likeCount} + 1` })
            .where(eq(collections.id, collectionId)).run();
    }

    static decrementLikeCount(collectionId: number) {
        getDbClient()
            .update(collections)
            .set({
                likeCount: sql`CASE WHEN ${collections.likeCount} > 0 THEN ${collections.likeCount} - 1 ELSE 0 END`,
            })
            .where(eq(collections.id, collectionId)).run();
    }

    static incrementCopyCount(collectionId: number) {
        getDbClient()
            .update(collections)
            .set({ copiedCount: sql`${collections.copiedCount} + 1` })
            .where(eq(collections.id, collectionId)).run();
    }

    private static _assertMediaExists(mediaType: MediaType, mediaIds: number[]) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        const result = getDbClient()
            .select({ count: count() })
            .from(mediaTable)
            .where(inArray(mediaTable.id, mediaIds))
            .get()!;

        if (result.count !== mediaIds.length) {
            throw new FormattedError("One or more selected media items could not be found.");
        }
    }
}
