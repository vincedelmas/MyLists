import {alias} from "drizzle-orm/sqlite-core";
import {toItemKey} from "@/lib/utils/media/item-key";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginate} from "@/lib/server/database/pagination";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import type {ScopedMediaFilterOptions} from "@/lib/types/media-list.types";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import type {MediaListDataByType} from "@/lib/server/domain/media/media-list.types";
import {Actor, profileCollectionVisibilityCondition} from "@/lib/server/authorization";
import {getMediaListSelection} from "@/lib/server/domain/media/base/media-list.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {createMediaBrowseQueryParts} from "@/lib/server/domain/media/base/media-browse.queries";
import {getMediaMetadataFilterOptions} from "@/lib/server/domain/media/base/media-filters.queries";
import {mediaTags, collectionItems, collectionLikes, collections, user} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, inArray, isNotNull, isNull, like, max, or, sql, type SQL} from "drizzle-orm";
import {collectionContainsMediaType, getCollectionMediaTypesSelection} from "@/lib/server/domain/collections/collections.queries";


type CollectionTrackingItem = MediaListDataByType[MediaType]["items"][number];


const communityCollectionOrder = [desc(collections.likeCount), desc(collections.viewCount), desc(collections.id)];


const collectionSelection = {
    ...getTableColumns(collections),
    ownerName: user.name,
    ownerImage: user.image,
    ownerPrivacy: user.privacy,
    mediaTypes: getCollectionMediaTypesSelection(),
    itemsCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${collectionItems}
        WHERE ${collectionItems.collectionId} = ${collections.id}
    )`,
};


const previewItemsSelection = sql`(
    SELECT json_group_array(json_object('mediaId', media_id, 'mediaType', media_type))
    FROM (
        SELECT ${collectionItems.mediaId} AS media_id, ${collectionItems.mediaType} AS media_type
        FROM ${collectionItems}
        WHERE ${collectionItems.collectionId} = ${collections.id}
        ORDER BY ${collectionItems.orderIndex} ASC
        LIMIT 4
    )
)`.mapWith((value: string) => {
    return JSON.parse(value) as { mediaId: number; mediaType: MediaType }[];
});


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
            }).where(eq(collections.id, collectionId))
            .run();
    }

    static deleteCollection(collectionId: number) {
        getDbClient()
            .delete(collections)
            .where(eq(collections.id, collectionId))
            .run();
    }

    static replaceCollectionItems(collectionId: number, items: (typeof collectionItems.$inferInsert)[]) {
        const idsByType = new Map<MediaType, number[]>();

        for (const item of items) {
            const ids = idsByType.get(item.mediaType) ?? [];
            ids.push(item.mediaId);
            idsByType.set(item.mediaType, ids);
        }

        for (const [mediaType, mediaIds] of idsByType) {
            this._assertMediaExists(mediaType, mediaIds);
        }

        getDbClient()
            .delete(collectionItems)
            .where(eq(collectionItems.collectionId, collectionId))
            .run();

        if (items.length === 0) return;

        getDbClient()
            .insert(collectionItems)
            .values(items)
            .run();
    }

    static getCollectionById(collectionId: number) {
        return getDbClient()
            .select(collectionSelection)
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
            .orderBy(asc(collectionItems.orderIndex))
            .all();
    }

    static async getPaginatedCollectionItems(collectionId: number, mediaTypes: MediaType[], filters: MediaBrowseFilters, viewerId?: number, includeFilterOptions = false) {
        const selectedTypes = filters.mediaType ? mediaTypes.filter(type => type === filters.mediaType) : mediaTypes;
        const sortKey = filters.sorting && filters.sorting !== "default" ? filters.sorting : undefined;
        const sort = sortKey ? MEDIA_SORT_DEFINITIONS[sortKey] : undefined;

        if (sortKey && !getMediaSortOptions(selectedTypes, true).some(option => option.value === sortKey)) {
            throw new FormattedError("This sorting is not available for these media types.");
        }

        const db = getDbClient();
        const queries = selectedTypes.map(mediaType => {
            const definition = getServerMediaDefinition(mediaType);
            const { mediaTable, listTable } = definition.repository.tables;
            const browse = createMediaBrowseQueryParts(definition, filters, viewerId);

            return db
                .select({
                    ...getTableColumns(collectionItems),
                    status: browse.selection.status.as("status"),
                    rating: browse.selection.rating.as("rating"),
                    addedAt: browse.selection.addedAt.as("added_at"),
                    mediaId: browse.selection.mediaId.as("media_id"),
                    favorite: browse.selection.favorite.as("favorite"),
                    mediaName: browse.selection.mediaName.as("media_name"),
                    inUserList: browse.selection.inUserList.as("in_user_list"),
                    lastUpdated: browse.selection.lastUpdated.as("last_updated"),
                    releaseDate: browse.selection.releaseDate.as("release_date"),
                    imageCover: sql<string>`COALESCE(${listTable.customCover}, ${mediaTable.imageCover})`.as("image_cover"),
                    sortValue: sql`${sort ? definition.repository.sortColumns[sort.field]! : collectionItems.orderIndex}`.as("sort_value"),
                })
                .from(collectionItems)
                .innerJoin(mediaTable, eq(mediaTable.id, collectionItems.mediaId))
                .leftJoin(listTable, browse.viewerJoin)
                .where(and(
                    eq(collectionItems.mediaType, mediaType),
                    eq(collectionItems.collectionId, collectionId),
                    ...browse.conditions,
                )).$dynamic();
        });

        const [firstQuery, ...otherQueries] = queries;
        for (const query of otherQueries) {
            firstQuery.unionAll(query);
        }

        const combinedQuery = firstQuery?.as("collection_results");
        const direction = sort?.direction === "desc" ? sql`DESC` : sql`ASC`;

        const result = await paginate({
            perPage: 24,
            maxPerPage: 24,
            page: filters.page,
            getTotal: () => combinedQuery
                ? db
                    .select({ count: count() })
                    .from(combinedQuery)
                    .get()!.count
                : 0,
            getItems: ({ limit, offset }) => combinedQuery
                ? db.select()
                    .from(combinedQuery)
                    .orderBy(
                        sql`${combinedQuery.sortValue} ${direction} NULLS LAST`,
                        sql`${combinedQuery.mediaName} COLLATE NOCASE ASC`,
                        asc(combinedQuery.mediaType), asc(combinedQuery.mediaId),
                    )
                    .limit(limit)
                    .offset(offset)
                : Promise.resolve([]),
        });

        const trackingById = new Map<string, CollectionTrackingItem>();
        if (viewerId !== undefined) {
            for (const mediaType of new Set(result.items.map(item => item.mediaType))) {
                const definition = getServerMediaDefinition(mediaType);
                const { listTable, mediaTable } = definition.repository.tables;
                const mediaIds = result.items.filter(item => item.mediaType === mediaType).map(item => item.mediaId);

                const tracked = db
                    .select(getMediaListSelection(definition.repository))
                    .from(listTable)
                    .innerJoin(user, eq(user.id, listTable.userId))
                    .innerJoin(mediaTable, eq(mediaTable.id, listTable.mediaId))
                    .where(and(eq(listTable.userId, viewerId), inArray(listTable.mediaId, mediaIds)))
                    .all();

                for (const item of tracked) {
                    trackingById.set(toItemKey({ mediaType, mediaId: item.mediaId }), {
                        ...item,
                        common: false,
                        imageCover: getImageUrl(definition.identity.coverDirectory, item.customCover ?? item.imageCover),
                    } as CollectionTrackingItem);
                }
            }
        }

        const filterOptions: { tags: string[]; genres: string[]; mediaTypes: MediaType[]; mediaFilters: ScopedMediaFilterOptions } = {
            tags: [], genres: [], mediaTypes, mediaFilters: {},
        };

        const filterMediaTypes = mediaTypes;

        if (includeFilterOptions && filterMediaTypes.length) {
            const sources = filterMediaTypes.map(mediaType => {
                const definition = getServerMediaDefinition(mediaType).repository;
                const { listTable, tagTable, genreTable } = definition.tables;

                const sourceMediaIds = db
                    .select({ mediaId: collectionItems.mediaId })
                    .from(collectionItems)
                    .leftJoin(listTable, and(eq(listTable.mediaId, collectionItems.mediaId), viewerId === undefined
                        ? sql`FALSE`
                        : eq(listTable.userId, viewerId))
                    ).where(and(
                        eq(collectionItems.collectionId, collectionId), eq(collectionItems.mediaType, mediaType),
                        filters.library === "in" ? isNotNull(listTable.userId) : undefined,
                        filters.library === "out" ? isNull(listTable.userId) : undefined,
                    ));

                filterOptions.mediaFilters[mediaType] = getMediaMetadataFilterOptions(definition, {
                    userId: viewerId,
                    mediaIds: sourceMediaIds.getSQL(),
                });

                const source = {
                    genres: db
                        .select({ name: genreTable.name })
                        .from(genreTable)
                        .where(and(
                            inArray(genreTable.mediaId, sourceMediaIds),
                            definition.filters.common.genres ? undefined : sql`FALSE`,
                        )),

                    tags: db
                        .select({ name: mediaTags.name })
                        .from(tagTable)
                        .innerJoin(mediaTags, eq(mediaTags.id, tagTable.tagId))
                        .where(and(
                            viewerId === undefined ? sql`FALSE` : eq(tagTable.userId, viewerId),
                            inArray(tagTable.mediaId, sourceMediaIds),
                            definition.filters.common.tags ? undefined : sql`FALSE`,
                        )),
                };

                Object.assign(filterOptions.mediaFilters[mediaType]!, {
                    genres: db
                        .all<{ name: string }>(sql`
                        SELECT DISTINCT "name"
                        FROM (${source.genres.getSQL()})
                        ORDER BY "name" COLLATE NOCASE`),
                    tags: db
                        .all<{ name: string }>(sql`
                        SELECT DISTINCT "name"
                        FROM (${source.tags.getSQL()})
                        ORDER BY "name" COLLATE NOCASE`),
                });

                return source;
            });

            filterOptions.genres = db
                .all<{ name: string }>(sql`
                SELECT DISTINCT "name"
                FROM (${sql.join(sources.map(source => source.genres.getSQL()), sql` UNION ALL `)})
                ORDER BY "name" COLLATE NOCASE`).map(item => item.name);

            filterOptions.tags = db
                .all<{ name: string }>(sql`
                SELECT DISTINCT "name"
                FROM (${sql.join(sources.map(source => source.tags.getSQL()), sql` UNION ALL `)})
                ORDER BY "name" COLLATE NOCASE`).map(item => item.name);
        }

        return {
            ...result,
            filterOptions,
            items: result.items.map(({ imageCover, sortValue: _sortValue, ...item }) => ({
                ...item,
                userMedia: trackingById.get(toItemKey(item)) ?? null,
                mediaCover: getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, imageCover),
            })),
        };
    }

    static async getUserCollectionMemberships(ownerId: number, mediaId: number, mediaType: MediaType) {
        const matchingItem = alias(collectionItems, "matchingItem");

        return getDbClient()
            .select({
                id: collections.id,
                title: collections.title,
                privacy: collections.privacy,
                itemsCount: collectionSelection.itemsCount,
                hasMedia: sql<boolean>`CASE WHEN ${matchingItem.id} IS NULL THEN 0 ELSE 1 END`.mapWith(Boolean).as("hasMedia"),
            })
            .from(collections)
            .leftJoin(matchingItem, and(
                eq(matchingItem.mediaId, mediaId),
                eq(matchingItem.mediaType, mediaType),
                eq(matchingItem.collectionId, collections.id),
            ))
            .where(eq(collections.ownerId, ownerId))
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
            .onConflictDoNothing()
            .run();
    }

    static deleteCollectionItem(collectionId: number, mediaId: number, mediaType: MediaType) {
        getDbClient()
            .delete(collectionItems)
            .where(and(
                eq(collectionItems.mediaId, mediaId),
                eq(collectionItems.mediaType, mediaType),
                eq(collectionItems.collectionId, collectionId),
            )).run();

        // Move ranks down in order so the unique order index never collides.
        for (const [index, item] of this.getCollectionItems(collectionId).entries()) {
            const orderIndex = index + 1;
            if (item.orderIndex === orderIndex) continue;

            getDbClient()
                .update(collectionItems)
                .set({ orderIndex })
                .where(eq(collectionItems.id, item.id))
                .run();
        }
    }

    static async getUserCollections(targetUserId: number, actor: Actor, mediaType?: MediaType, pinnedOnly = false) {
        return getDbClient()
            .select({
                ...collectionSelection,
                previewItems: previewItemsSelection,
            })
            .from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .where(and(
                eq(collections.ownerId, targetUserId),
                mediaType ? collectionContainsMediaType(mediaType) : undefined,
                pinnedOnly ? isNotNull(collections.profilePosition) : undefined,
                profileCollectionVisibilityCondition(actor, targetUserId),
            ))
            .orderBy(desc(collections.likeCount));
    }

    static async getPaginatedUserCollections(targetUserId: number, actor: Actor, params: Omit<UserCollectionsSearch, "username">, publicOnly = false) {
        const searchFilter = params.search?.trim();

        const conditions = and(
            searchFilter ? like(collections.title, `%${searchFilter}%`) : undefined,
            profileCollectionVisibilityCondition(actor, targetUserId),
            publicOnly ? eq(collections.privacy, PrivacyType.PUBLIC) : undefined,
            eq(collections.ownerId, targetUserId),
            params.mediaType ? collectionContainsMediaType(params.mediaType) : undefined,
        );

        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .where(conditions).get()?.count ?? 0;
            },

            getItems: ({ limit, offset }) => this._getCollectionPage(conditions, limit, offset, [desc(collections.likeCount), desc(collections.id)]),
        });
    }

    static async getPublicCollections(params: CommunitySearch) {
        const searchFilter = params.search?.trim();

        const searchCondition = searchFilter
            ? or(
                like(user.name, `%${searchFilter}%`),
                like(collections.title, `%${searchFilter}%`),
                like(collections.description, `%${searchFilter}%`),
            )
            : undefined;

        const conditions = and(
            eq(collections.privacy, PrivacyType.PUBLIC),
            params.mediaType ? collectionContainsMediaType(params.mediaType) : undefined,
            searchCondition,
        );

        return paginate({
            perPage: 12,
            maxPerPage: 12,
            page: params.page,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .innerJoin(user, eq(collections.ownerId, user.id))
                    .where(conditions).get()?.count ?? 0;
            },

            getItems: ({ limit, offset }) => this._getCollectionPage(conditions, limit, offset, communityCollectionOrder),
        });
    }

    private static _getCollectionPage(conditions: SQL | undefined, limit: number, offset: number, order: SQL[]) {
        // Limit the IDs before evaluating counts, media types and previews.
        const pageCollections = getDbClient()
            .select({ id: collections.id })
            .from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .where(conditions)
            .orderBy(...order)
            .limit(limit)
            .offset(offset)
            .as("page_collections");

        return getDbClient()
            .select({ ...collectionSelection, previewItems: previewItemsSelection })
            .from(pageCollections)
            .innerJoin(collections, eq(collections.id, pageCollections.id))
            .innerJoin(user, eq(collections.ownerId, user.id))
            .orderBy(...order);
    }


    static async getMediaCommunityCollections(mediaId: number, mediaType: MediaType) {
        return getDbClient()
            .select({
                ...collectionSelection,
                previewItems: previewItemsSelection,
            }).from(collections)
            .innerJoin(user, eq(collections.ownerId, user.id))
            .innerJoin(collectionItems, and(
                eq(collectionItems.mediaId, mediaId),
                eq(collectionItems.mediaType, mediaType),
                eq(collectionItems.collectionId, collections.id),
            )).where(eq(collections.privacy, PrivacyType.PUBLIC))
            .orderBy(...communityCollectionOrder)
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
            .values({ userId, collectionId })
            .run();
    }

    static deleteLike(likeId: number) {
        getDbClient()
            .delete(collectionLikes)
            .where(eq(collectionLikes.id, likeId))
            .run();
    }

    static async incrementViewCount(collectionId: number) {
        await getDbClient()
            .update(collections)
            .set({ viewCount: sql`${collections.viewCount} + 1` })
            .where(eq(collections.id, collectionId));
    }

    static incrementLikeCount(collectionId: number) {
        return getDbClient()
            .update(collections)
            .set({ likeCount: sql`${collections.likeCount} + 1` })
            .where(eq(collections.id, collectionId))
            .returning({ likeCount: collections.likeCount })
            .get().likeCount;
    }

    static decrementLikeCount(collectionId: number) {
        return getDbClient()
            .update(collections)
            .set({
                likeCount: sql`CASE WHEN ${collections.likeCount} > 0 THEN ${collections.likeCount} - 1 ELSE 0 END`,
            }).where(eq(collections.id, collectionId))
            .returning({ likeCount: collections.likeCount })
            .get().likeCount;
    }

    static incrementCopyCount(collectionId: number) {
        getDbClient()
            .update(collections)
            .set({ copiedCount: sql`${collections.copiedCount} + 1` })
            .where(eq(collections.id, collectionId))
            .run();
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
