import {and, asc, desc, eq, like, or, sql} from "drizzle-orm";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, SocialState, Status} from "@/lib/utils/enums";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {collectionItems, collections, dynamicLists, followers, user} from "@/lib/server/database/schema";


const MAX_MEDIA_RESULTS = 8;
const MAX_SECONDARY_RESULTS = 5;


const likePattern = (query: string) => `%${escapeLike(query)}%`;

const prefixPattern = (query: string) => `${escapeLike(query)}%`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");


export const searchCommandPalette = async (userId: number, activeMediaTypes: MediaType[], rawQuery: string) => {
    const db = getDbClient();

    const query = rawQuery.trim();
    const contains = likePattern(query);
    const prefix = prefixPattern(query);

    const media = searchTrackedMedia(userId, activeMediaTypes, contains, prefix);

    const userCollections = db
        .select({
            id: collections.id,
            title: collections.title,
            itemsCount: sql<number>`(
                SELECT COUNT(*)
                FROM ${collectionItems}
                WHERE ${collectionItems.collectionId} = ${collections.id}
            )`,
        }).from(collections)
        .where(and(
            eq(collections.ownerId, userId),
            like(collections.title, contains).append(sql` ESCAPE '\\'`),
        )).orderBy(
            sql`CASE WHEN ${collections.title} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
            desc(collections.updatedAt),
            asc(sql`${collections.title} COLLATE NOCASE`),
        ).limit(MAX_SECONDARY_RESULTS)
        .all();

    const dynamicTitle = sql<string>`json_extract(${dynamicLists.spec}, '$.title')`;
    const userDynamicLists = db
        .select({
            id: dynamicLists.id,
            title: dynamicTitle,
        }).from(dynamicLists)
        .where(and(
            eq(dynamicLists.userId, userId),
            sql`${dynamicTitle} LIKE ${contains} ESCAPE '\\'`,
        )).orderBy(
            sql`CASE WHEN ${dynamicTitle} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
            desc(dynamicLists.updatedAt),
            asc(sql`${dynamicTitle} COLLATE NOCASE`),
        ).limit(MAX_SECONDARY_RESULTS)
        .all();

    const userFollows = db
        .select({
            id: user.id,
            name: user.name,
            image: user.image,
        }).from(followers)
        .innerJoin(user, eq(followers.followedId, user.id))
        .where(and(
            eq(followers.followerId, userId),
            eq(followers.status, SocialState.ACCEPTED),
            like(user.name, contains).append(sql` ESCAPE '\\'`),
        )).orderBy(
            sql`CASE WHEN ${user.name} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
            asc(sql`${user.name} COLLATE NOCASE`),
        ).limit(MAX_SECONDARY_RESULTS)
        .all();

    return {
        media,
        follows: userFollows,
        collections: userCollections,
        dynamicLists: userDynamicLists,
    };
};


const searchTrackedMedia = (userId: number, activeMediaTypes: MediaType[], contains: string, prefix: string) => {
    if (activeMediaTypes.length === 0) return [];

    const db = getDbClient();

    const queries = activeMediaTypes.map(mediaType => {
        const { repository: { tables: { mediaTable, listTable } } } = getServerMediaDefinition(mediaType);

        const displayName = listTable.customTitle ?? mediaTable.name;
        const matchConditions = [like(mediaTable.name, contains).append(sql` ESCAPE '\\'`)];

        if (listTable.customTitle) {
            matchConditions.push(like(listTable.customTitle, contains).append(sql` ESCAPE '\\'`));
        }

        if (mediaTable.originalName) {
            matchConditions.push(like(mediaTable.originalName, contains).append(sql` ESCAPE '\\'`));
        }

        const rank = sql<number>`CASE WHEN ${displayName} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`;

        return db
            .select({
                rank: rank.as("rank"),
                name: displayName.as("name"),
                rating: listTable.rating.as("rating"),
                status: listTable.status.as("status"),
                mediaId: listTable.mediaId.as("media_id"),
                favorite: listTable.favorite.as("favorite"),
                mediaType: sql<MediaType>`${mediaType}`.as("media_type"),
                imageCover: sql<string>`COALESCE(${listTable.customCover}, ${mediaTable.imageCover})`.as("image_cover"),
                updatedAt: sql<number>`JULIANDAY(COALESCE(${listTable.lastUpdated}, ${listTable.addedAt}))`.as("updated_at"),
            }).from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                eq(listTable.userId, userId),
                or(...matchConditions),
            )).$dynamic();
    });

    const combined = queries
        .slice(1)
        .reduce((acc, next) => acc.unionAll(next), queries[0])
        .as("command_palette_media");

    const rows = db
        .select()
        .from(combined)
        .orderBy(
            asc(combined.rank),
            desc(combined.updatedAt),
            asc(sql`${combined.name} COLLATE NOCASE`),
            asc(combined.mediaType),
            asc(combined.mediaId),
        ).limit(MAX_MEDIA_RESULTS)
        .all();

    return rows.map(({ rank: _rank, updatedAt: _updatedAt, imageCover, favorite, ...row }) => ({
        ...row,
        favorite: Boolean(favorite),
        status: row.status as Status,
        imageCover: getImageUrl(getServerMediaDefinition(row.mediaType).identity.coverDirectory, imageCover),
    }));
};
