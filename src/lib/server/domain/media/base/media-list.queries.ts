import type {MediaListArgs} from "@/lib/schemas/media-lists.schema";
import {user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {IdNamePair} from "@/lib/types/media-common.types";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import type {ExpandedListFilters, MediaListData} from "@/lib/types/media-list.types";
import type {AnyMediaRepositoryDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {and, asc, count, eq, inArray, notInArray, sql} from "drizzle-orm";
import {getMediaCommonFilterConditions, getMediaMetadataFilterConditions, getMediaMetadataFilterOptions, getMediaNameSearchCondition} from "@/lib/server/domain/media/base/media-filters.queries";


export const getMediaListSelection = <TRepoDef extends AnyMediaRepositoryDefinition>(definition: TRepoDef) => {
    const { listQuery, tables: { listTable, tagTable } } = definition;

    return {
        ...listQuery.selection,
        ratingSystem: user.ratingSystem,
        tags: sql<IdNamePair[]>`COALESCE((
            SELECT json_group_array(DISTINCT json_object('id', l.id, 'name', l.name))
            FROM ${tagTable} l
            WHERE l.media_id = ${listTable.mediaId} AND l.user_id = ${listTable.userId}
        ), json_array())`.mapWith(JSON.parse),
    };
};


export const createMediaListQueries = <TRepoDef extends AnyMediaRepositoryDefinition>(definition: TRepoDef) => {
    const { listQuery, tables: { listTable, mediaTable, tagTable, genreTable } } = definition;

    return {
        async getListFilters(userId: number): Promise<ExpandedListFilters> {
            const genresPromise = definition.filters.common.genres ? getDbClient()
                .selectDistinct({ name: sql<string>`${genreTable.name}` })
                .from(genreTable)
                .innerJoin(listTable, eq(listTable.mediaId, genreTable.mediaId))
                .where(eq(listTable.userId, userId))
                .orderBy(asc(genreTable.name)) : [];

            const tagsPromise = definition.filters.common.tags ? getDbClient()
                .selectDistinct({ name: sql<string>`${tagTable.name}` })
                .from(tagTable)
                .where(eq(tagTable.userId, userId))
                .orderBy(asc(tagTable.name)) : [];

            const [genres, tags] = await Promise.all([genresPromise, tagsPromise]);

            const mediaIds = getDbClient().select({ mediaId: listTable.mediaId }).from(listTable)
                .where(eq(listTable.userId, userId)).getSQL();

            return {
                tags,
                genres,
                ...getMediaMetadataFilterOptions(definition, { mediaIds, userId }),
            };
        },

        async getUserFavorites(userId: number, limit = 7) {
            return getDbClient()
                .select({
                    mediaId: mediaTable.id,
                    mediaName: mediaTable.name,
                    mediaCover: mediaTable.imageCover,
                    customCover: listTable.customCover,
                    releaseDate: mediaTable.releaseDate,
                })
                .from(listTable)
                .where(and(eq(listTable.userId, userId), eq(listTable.favorite, true)))
                .leftJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
                .limit(limit);
        },

        async searchUserListByName(userId: number, query: string, limit = 10) {
            return getDbClient()
                .selectDistinct({
                    mediaId: mediaTable.id,
                    mediaName: mediaTable.name,
                    mediaCover: mediaTable.imageCover,
                    customCover: listTable.customCover,
                    releaseDate: mediaTable.releaseDate,
                })
                .from(listTable)
                .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
                .where(and(eq(listTable.userId, userId), getMediaNameSearchCondition(mediaTable, query)))
                .orderBy(asc(mediaTable.name))
                .limit(limit);
        },

        async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs): Promise<MediaListData<TRepoDef["tables"]["listTable"]["$inferSelect"]>> {
            const { page, perPage, offset, limit } = resolvePagination({ page: args.page, perPage: args.perPage });
            const sortKeyName = resolveSorting(args.sorting, Object.keys(listQuery.sorts), listQuery.defaultSort);
            const selectedSort = listQuery.sorts[sortKeyName];
            const filterArgs = { ...args, currentUserId, userId };

            // Main query builder
            let queryBuilder = getDbClient()
                .select(getMediaListSelection(definition))
                .from(listTable)
                .innerJoin(user, eq(listTable.userId, user.id))
                .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
                .$dynamic();

            // Count query builder
            let countQueryBuilder = getDbClient()
                .select({ count: count() })
                .from(listTable)
                .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
                .$dynamic();

            const conditions = [
                eq(listTable.userId, userId),
                ...getMediaCommonFilterConditions(definition, {
                    ...filterArgs, favorite: filterArgs.favorite === true ? true : undefined,
                }, userId),
                ...getMediaMetadataFilterConditions(definition, filterArgs, userId),
            ];

            if (filterArgs.hideCommon && currentUserId && currentUserId !== userId) {
                conditions.push(notInArray(listTable.mediaId, getDbClient()
                    .select({ mediaId: listTable.mediaId })
                    .from(listTable)
                    .where(eq(listTable.userId, currentUserId))));
            }

            // Finish building query
            queryBuilder = queryBuilder.where(and(...conditions));
            countQueryBuilder = countQueryBuilder.where(and(...conditions));
            const finalQuery = queryBuilder
                .orderBy(...(Array.isArray(selectedSort) ? selectedSort : [selectedSort]))
                .limit(limit)
                .offset(offset);

            // Execute query
            const [results, totalResult] = await Promise.all([finalQuery.execute(), countQueryBuilder.get()]);

            // Calculate total pages
            const totalItems = totalResult?.count ?? 0;
            const totalPages = Math.ceil(totalItems / perPage);

            // Fetch common IDs (if in filter)
            let commonIdsSet = new Set<number>();
            if (currentUserId && currentUserId !== userId && !filterArgs.hideCommon && results.length > 0) {
                const mediaIds = results.map((m: any) => m.mediaId);
                const commonMediaIdsResult = await getDbClient()
                    .select({ mediaId: listTable.mediaId })
                    .from(listTable)
                    .where(and(eq(listTable.userId, currentUserId), inArray(listTable.mediaId, mediaIds)));

                commonIdsSet = new Set(commonMediaIdsResult.map(m => m.mediaId));
            }

            // Process results - add `common` field and replace `imageCover` with user's `customCover`
            const processedResults = results.map((item: any) => ({
                ...item,
                common: commonIdsSet.has(item.mediaId),
                imageCover: item.customCover ?? item.imageCover,
            }));

            return {
                items: processedResults,
                pagination: {
                    page,
                    perPage,
                    totalPages,
                    totalItems,
                    sorting: sortKeyName,
                    availableSorting: Object.keys(listQuery.sorts),
                },
            };
        },
    };
};
