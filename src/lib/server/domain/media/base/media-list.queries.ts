import {MediaListArgs} from "@/lib/schemas";
import {user} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";
import {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import type {ExpandedListFilters, MediaListData} from "@/lib/types/media-list.types";
import type {AnyMediaRepositoryDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {and, asc, count, eq, inArray, isNotNull, like, notInArray, or, type SQL, sql} from "drizzle-orm";


export type FilterDefinitions = Partial<Record<keyof MediaListArgs, FilterDefinition>>;
export type FilterOptionLoaders = Record<string, (userId: number) => Promise<{ name: string }[]>>;

type FilterDefinition = {
    isActive: (args: MediaListArgs) => boolean;
    getCondition: (args: MediaListArgs) => SQL | undefined;
};

type ArrayFilterDefinition = {
    filterColumn: SQLiteColumn;
    argName: keyof MediaListArgs;
    mediaTable: SQLiteTable & { id: SQLiteColumn };
    entityTable?: SQLiteTable & { mediaId: SQLiteColumn };
    entityScope?: (args: MediaListArgs) => SQL | undefined;
};

type ListColOptionsDefinition = {
    nameColumn: SQLiteColumn;
    listTable: SQLiteTable & { userId: SQLiteColumn };
};

type MediaColOptionsDefinition = {
    nameColumn: SQLiteColumn;
    mediaTable: SQLiteTable & { id: SQLiteColumn };
    listTable: SQLiteTable & { mediaId: SQLiteColumn; userId: SQLiteColumn };
};


export const createMediaListQueries = <TRepoDef extends AnyMediaRepositoryDefinition>(definition: TRepoDef) => {
    const { listQuery, tables: { listTable, mediaTable, tagTable, genreTable } } = definition;

    const mediaNameSearchCondition = (query: string) => {
        const pattern = `%${query}%`;
        const nameCondition = or(like(mediaTable.name, pattern), like(listQuery.selection.mediaName, pattern));

        return mediaTable.originalName
            ? or(nameCondition, like(mediaTable.originalName, pattern))
            : nameCondition;
    };

    const baseFilterDefs: FilterDefinitions = {
        search: {
            isActive: (args: MediaListArgs) => !!args.search,
            getCondition: (args: MediaListArgs) => mediaNameSearchCondition(args.search!),
        },
        favorite: {
            isActive: (args: MediaListArgs) => args.favorite === true,
            getCondition: (_args: MediaListArgs) => eq(listTable.favorite, true),
        },
        comment: {
            isActive: (args: MediaListArgs) => args.comment === true,
            getCondition: (_args: MediaListArgs) => isNotNull(listTable.comment),
        },
        hideCommon: {
            isActive: (args: MediaListArgs) => args.hideCommon === true && !!args.currentUserId && args.currentUserId !== args.userId,
            getCondition: (args: MediaListArgs) => {
                const subQuery = getDbClient()
                    .select({ mediaId: listTable.mediaId })
                    .from(listTable)
                    .where(eq(listTable.userId, args.currentUserId!));
                return notInArray(listTable.mediaId, subQuery);
            },
        },
        status: createArrayFilter({
            argName: "status",
            mediaTable: mediaTable,
            filterColumn: listTable.status,
        }),
        tags: createArrayFilter({
            argName: "tags",
            mediaTable: mediaTable,
            entityTable: tagTable,
            filterColumn: tagTable.name,
            entityScope: (args) => eq(tagTable.userId, args.userId!),
        }),
        genres: createArrayFilter({
            argName: "genres",
            mediaTable: mediaTable,
            entityTable: genreTable,
            filterColumn: genreTable.name,
        }),
    };

    return {
        async getListFilters(userId: number): Promise<ExpandedListFilters> {
            const { filterOptions } = listQuery;

            const genresPromise = getDbClient()
                .selectDistinct({ name: sql<string>`${genreTable.name}` })
                .from(genreTable)
                .innerJoin(listTable, eq(listTable.mediaId, genreTable.mediaId))
                .where(eq(listTable.userId, userId))
                .orderBy(asc(genreTable.name));

            const tagsPromise = getDbClient()
                .selectDistinct({ name: sql<string>`${tagTable.name}` })
                .from(tagTable)
                .where(and(eq(tagTable.userId, userId)))
                .orderBy(asc(tagTable.name));

            const [genres, tags] = await Promise.all([genresPromise, tagsPromise]);

            const specificEntries = await Promise.all(Object
                .entries(filterOptions)
                .map(async ([name, loadOptions]) => [name, await loadOptions(userId)] as const));

            return {
                tags,
                genres,
                ...Object.fromEntries(specificEntries),
            };
        },

        async getUserFavorites(userId: number, limit = 7) {
            return getDbClient()
                .select({
                    mediaId: mediaTable.id,
                    mediaName: listQuery.selection.mediaName,
                    mediaCover: listQuery.selection.imageCover,
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
                    mediaName: listQuery.selection.mediaName,
                    mediaCover: listQuery.selection.imageCover,
                    customCover: listTable.customCover,
                    releaseDate: mediaTable.releaseDate,
                })
                .from(listTable)
                .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
                .where(and(eq(listTable.userId, userId), mediaNameSearchCondition(query)))
                .orderBy(asc(listQuery.selection.mediaName))
                .limit(limit);
        },

        async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs): Promise<MediaListData<TRepoDef["tables"]["listTable"]["$inferSelect"]>> {
            const { page, perPage, offset, limit } = resolvePagination({ page: args.page, perPage: args.perPage });
            const sortKeyName = resolveSorting(args.sorting, Object.keys(listQuery.sorts), listQuery.defaultSort);
            const selectedSort = listQuery.sorts[sortKeyName];
            const filterArgs = { ...args, currentUserId, userId };

            const allFilters = {
                ...baseFilterDefs,
                ...listQuery.filters,
            };

            // Main query builder
            let queryBuilder = getDbClient()
                .select({
                    ...listQuery.selection,
                    ratingSystem: user.ratingSystem,
                    tags: sql` COALESCE((
                        SELECT json_group_array(DISTINCT json_object(
                            'id', l.id,
                            'name', l.name
                        ))
                        FROM ${tagTable} l
                        WHERE l.media_id = ${listTable.mediaId} AND l.user_id = ${listTable.userId}
                        ), json_array()
                    )`.mapWith(JSON.parse),
                })
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

            // Iterate through all filters
            const conditions = [eq(listTable.userId, userId)];
            for (const filterName of Object.keys(allFilters)) {
                const currentFilter = allFilters[filterName as keyof MediaListArgs];
                if (currentFilter?.isActive(filterArgs)) {
                    const condition = currentFilter.getCondition(filterArgs);
                    if (condition) {
                        conditions.push(condition);
                    }
                }
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


const isNonEmptyArray = (value: unknown): value is unknown[] => {
    return Array.isArray(value) && value.length > 0;
}


export const createArrayFilter = ({ argName, entityTable, filterColumn, mediaTable, entityScope }: ArrayFilterDefinition): FilterDefinition => {
    return ({
        isActive: (args) => isNonEmptyArray(args[argName]),
        getCondition: (args) => {
            const values = args[argName] as string[];
            if (!entityTable) return inArray(filterColumn, values);

            const subQuery = getDbClient()
                .select({ mediaId: entityTable.mediaId })
                .from(entityTable)
                .where(and(inArray(filterColumn, values), entityScope?.(args)));

            return inArray(mediaTable.id, subQuery);
        },
    });
}


export const createMediaColOptionsLoader = ({ mediaTable, listTable, nameColumn }: MediaColOptionsDefinition) => {
    return async (userId: number) => {
        return getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), isNotNull(nameColumn)));
    }
}


export const createListColOptionsLoader = ({ listTable, nameColumn }: ListColOptionsDefinition) => {
    return async (userId: number) => {
        return getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(listTable)
            .where(and(eq(listTable.userId, userId), isNotNull(nameColumn)));
    }
}
