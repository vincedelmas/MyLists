import {alias} from "drizzle-orm/sqlite-core";
import {CommunitySearch} from "@/lib/schemas";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {collectionItems, collectionLikes, collections, user} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, inArray, like, max, or, sql} from "drizzle-orm";


export class CollectionsRepository {
    static async createCollection(values: typeof collections.$inferInsert) {
        return getDbClient()
            .insert(collections)
            .values(values)
            .returning({ id: collections.id })
            .then((res) => res[0].id);
    }

    static async updateCollection(collectionId: number, values: Partial<typeof collections.$inferInsert>) {
        await getDbClient()
            .update(collections)
            .set({
                ...values,
                updatedAt: sql`datetime('now')`,
            })
            .where(eq(collections.id, collectionId));
    }

    static async deleteCollection(collectionId: number) {
        const tx = getDbClient();

        await tx
            .delete(collections)
            .where(eq(collections.id, collectionId));
    }

    static async replaceCollectionItems(collectionId: number, items: (typeof collectionItems.$inferInsert)[]) {
        await getDbClient()
            .delete(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId));

        if (items.length === 0) return;

        await getDbClient()
            .insert(collectionItems)
            .values(items);
    }

    static async getCollectionById(collectionId: number) {
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

    static async getCollectionItems(collectionId: number) {
        return getDbClient()
            .select()
            .from(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId))
            .orderBy(asc(collectionItems.orderIndex));
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

    static async getMaxCollectionItemOrder(collectionId: number) {
        return getDbClient()
            .select({ maxOrder: max(collectionItems.orderIndex) })
            .from(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId))
            .get()?.maxOrder ?? 0;
    }

    static async insertCollectionItem(item: typeof collectionItems.$inferInsert) {
        await getDbClient()
            .insert(collectionItems)
            .values(item)
            .onConflictDoNothing();
    }

    static async deleteCollectionItem(collectionId: number, mediaId: number) {
        await getDbClient()
            .delete(collectionItems)
            .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaId, mediaId)));
    }

    static async getUserCollections(targetUserId: number, canViewPrivate: boolean, mediaType?: MediaType) {
        return getDbClient()
            .select({
                ownerName: user.name,
                ownerImage: user.image,
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
                canViewPrivate ? undefined : inArray(collections.privacy, [PrivacyType.PUBLIC, PrivacyType.RESTRICTED]),
            ))
            .orderBy(desc(collections.likeCount));
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

    static async findLikedCollection(userId: number, collectionId: number) {
        return getDbClient()
            .select()
            .from(collectionLikes)
            .where(and(eq(collectionLikes.userId, userId), eq(collectionLikes.collectionId, collectionId)))
            .get();
    }

    static async insertLike(userId: number, collectionId: number) {
        await getDbClient()
            .insert(collectionLikes)
            .values({ userId, collectionId });
    }

    static async deleteLike(likeId: number) {
        await getDbClient()
            .delete(collectionLikes)
            .where(eq(collectionLikes.id, likeId));
    }

    static async incrementViewCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({ viewCount: sql`${collections.viewCount} + 1` })
            .where(eq(collections.id, collectionId));
    }

    static async incrementLikeCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({ likeCount: sql`${collections.likeCount} + 1` })
            .where(eq(collections.id, collectionId));
    }

    static async decrementLikeCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({
                likeCount: sql`CASE WHEN ${collections.likeCount} > 0 THEN ${collections.likeCount} - 1 ELSE 0 END`,
            })
            .where(eq(collections.id, collectionId));
    }

    static async incrementCopyCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({ copiedCount: sql`${collections.copiedCount} + 1` })
            .where(eq(collections.id, collectionId));
    }
}
