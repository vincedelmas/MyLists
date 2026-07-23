import {notFound} from "@tanstack/react-router";
import {MediaInfo} from "@/lib/types/activity.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {MediaListArgs, SearchType, SimpleSearch} from "@/lib/schemas";
import {AddedMediaDetails, Tag} from "@/lib/types/media-common.types";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {ExpandedListFilters, ExportMediaList, MediaListData} from "@/lib/types/media-list.types";
import {JobType, MediaType, PrivacyType, SocialState, Status, TagAction} from "@/lib/utils/enums";
import {createArrayFilter, type FilterDefinitions} from "@/lib/server/domain/media/base/media-list.query";
import {AnyMediaRepositoryDefinition, AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {MediaCommunityActivityStats, UserFollowsMediaData, UserMediaWithTags} from "@/lib/types/user-media.types";
import {animeList, booksList, collectionItems, followers, gamesList, mangaList, moviesList, seriesList, user, userMediaSettings} from "@/lib/server/database/schema";
import {and, asc, count, countDistinct, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, lt, lte, ne, notExists, notInArray, or, SQL, sql} from "drizzle-orm";


const SIMILAR_MAX_GENRES = 10;
const USER_MEDIA_INSERT_BATCH_SIZE = 200;


export abstract class BaseRepository<
    TMediaDef extends AnyServerMediaDefinition,
    TRepoDef extends AnyMediaRepositoryDefinition = TMediaDef["repository"],
> {
    readonly repoDefinition: TRepoDef;
    readonly identity: TMediaDef["identity"];
    protected readonly ingestion: TMediaDef["ingestion"];
    protected readonly attribution: TMediaDef["attribution"];
    protected readonly baseFilterDefs: FilterDefinitions;

    protected constructor(definition: TMediaDef) {
        this.identity = definition.identity;
        this.ingestion = definition.ingestion;
        this.attribution = definition.attribution;
        this.repoDefinition = definition.repository as TRepoDef;

        // Must be instantiated after definition
        this.baseFilterDefs = this.baseListFiltersDefs();
    }

    private baseListFiltersDefs = (): FilterDefinitions => {
        const { listTable, mediaTable, tagTable, genreTable } = this.repoDefinition.tables;

        return {
            search: {
                isActive: (args: MediaListArgs) => !!args.search,
                getCondition: (args: MediaListArgs) => like(mediaTable.name, `%${args.search}%`),
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
    }

    async bulkInsertUserMedia(rows: TRepoDef["tables"]["listTable"]["$inferInsert"][]) {
        const { listTable } = this.repoDefinition.tables;

        if (rows.length === 0) return [];

        const insertedRows: TRepoDef["tables"]["listTable"]["$inferSelect"][] = [];

        for (let offset = 0; offset < rows.length; offset += USER_MEDIA_INSERT_BATCH_SIZE) {
            const batch = rows.slice(offset, offset + USER_MEDIA_INSERT_BATCH_SIZE);
            const inserted = await getDbClient()
                .insert(listTable)
                .values(batch)
                .onConflictDoNothing({ target: [listTable.userId, listTable.mediaId] })
                .returning();

            insertedRows.push(...inserted);
        }

        return insertedRows;
    }

    async getCoverFilenames() {
        const { mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({ imageCover: mediaTable.imageCover })
            .from(mediaTable);
    }

    async getPopularMediaRefs() {
        const { popularity, tables: { mediaTable } } = this.repoDefinition;

        if (!popularity) return [];

        return getDbClient()
            .select({
                id: mediaTable.id,
                releaseDate: mediaTable.releaseDate,
            })
            .from(mediaTable)
            .where(and(
                popularity.eligibility,
                isNotNull(mediaTable.releaseDate),
                ne(mediaTable.imageCover, ""),
                ne(mediaTable.releaseDate, ""),
                lte(mediaTable.releaseDate, sql`date('now')`),
            ))
            .then((rows) => rows.map((row) => ({
                id: row.id as number,
                releaseDate: row.releaseDate! as string,
            })));
    }

    async getCustomCoverFilenames() {
        const { listTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({ customCover: listTable.customCover })
            .from(listTable)
            .where(isNotNull(listTable.customCover));
    }

    async getOrphanedMediaIds(mediaType: MediaType) {
        const { mediaTable, listTable } = this.repoDefinition.tables;

        const tx = getDbClient();
        const mediaToDelete = await tx
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .where(and(
                notExists(tx.select()
                    .from(listTable)
                    .where(eq(listTable.mediaId, mediaTable.id))
                ),
                notExists(tx.select()
                    .from(collectionItems)
                    .where(and(eq(collectionItems.mediaId, mediaTable.id), eq(collectionItems.mediaType, mediaType)))
                )
            ));

        return mediaToDelete.map((media) => media.id);
    }

    async getTagNames(userId: number) {
        const { tagTable } = this.repoDefinition.tables;

        return getDbClient()
            .selectDistinct({ name: sql<string>`${tagTable.name}` })
            .from(tagTable)
            .where(eq(tagTable.userId, userId))
            .orderBy(asc(tagTable.name));
    }

    async removeMediaByIds(mediaIds: number[]) {
        const { mediaTable, deleteDependents } = this.repoDefinition.tables;

        // Delete on other tables
        for (const table of deleteDependents) {
            await getDbClient()
                .delete(table)
                .where(inArray(table.mediaId, mediaIds));
        }

        // Delete on main table
        await getDbClient()
            .delete(mediaTable)
            .where(inArray(mediaTable.id, mediaIds));
    }

    async searchMediadleSuggestion(query: string, limit = 20) {
        const { mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({
                id: mediaTable.id,
                name: sql<string>`${mediaTable.name}`,
            })
            .from(mediaTable)
            .where(like(mediaTable.name, `%${query.toLowerCase()}%`))
            .orderBy(mediaTable.name)
            .limit(limit);
    }

    async searchByName(query: string, limit = 5): Promise<ProviderSearchResult[]> {
        const { mediaType } = this.identity;
        const { mediaTable } = this.repoDefinition.tables;

        const results = await getDbClient()
            .select({
                id: mediaTable.apiId,
                name: mediaTable.name,
                image: mediaTable.imageCover,
                date: mediaTable.releaseDate,
            })
            .from(mediaTable)
            .where(like(mediaTable.name, `%${query.toLowerCase()}%`))
            .orderBy(mediaTable.name)
            .limit(limit);

        return results.map((r) => ({ ...r, itemType: mediaType }));
    }

    async removeMediaFromUserList(userId: number, mediaId: number) {
        const { listTable, tagTable } = this.repoDefinition.tables;

        await getDbClient()
            .delete(listTable)
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)));

        await getDbClient()
            .delete(tagTable)
            .where(and(eq(tagTable.userId, userId), eq(tagTable.mediaId, mediaId)));
    }

    async findSimilarMedia(mediaId: number) {
        const { mediaTable, genreTable } = this.repoDefinition.tables;

        const targetGenresSubQuery = getDbClient()
            .select({ name: genreTable.name })
            .from(genreTable)
            .where(eq(genreTable.mediaId, mediaId));

        const similarSub = getDbClient()
            .select({
                mediaId: genreTable.mediaId,
                commonGenreCount: count(genreTable.name).as("common_genre_count")
            })
            .from(genreTable)
            .where(and(ne(genreTable.mediaId, mediaId), inArray(genreTable.name, targetGenresSubQuery)))
            .groupBy(genreTable.mediaId)
            .orderBy(desc(sql`common_genre_count`))
            .limit(SIMILAR_MAX_GENRES)
            .as("similar_media");

        return getDbClient()
            .select({
                mediaCover: mediaTable.imageCover,
                mediaId: sql<number>`${mediaTable.id}`,
                mediaName: sql<string>`${mediaTable.name}`,
            })
            .from(similarSub)
            .innerJoin(mediaTable, eq(mediaTable.id, similarSub.mediaId))
            .orderBy(desc(similarSub.commonGenreCount));
    }

    async getMediaDetailsByIds(mediaIds: number[], userId?: number): Promise<MediaInfo[]> {
        const { mediaTable, listTable } = this.repoDefinition.tables;

        const uniqueMediaIds = [...new Set(mediaIds)];

        const mediaInfo = await getDbClient()
            .select({
                ...getTableColumns(mediaTable),
                customCover: listTable.customCover,
                inUserList: isNotNull(listTable.userId).mapWith(Boolean).as("inUserList"),
            })
            .from(mediaTable)
            .leftJoin(listTable, and(
                eq(listTable.mediaId, mediaTable.id),
                userId === undefined ? sql`FALSE` : eq(listTable.userId, userId),
            ))
            .where(inArray(mediaTable.id, uniqueMediaIds));

        return mediaInfo as unknown as MediaInfo[];
    }

    async getMediaDurationsByIds(mediaIds: number[]) {
        const { mediaType } = this.identity;
        const { mediaTable } = this.repoDefinition.tables;

        const uniqueMediaIds = [...new Set(mediaIds)];
        if (uniqueMediaIds.length === 0) return [];

        const hasDuration = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME || mediaType === MediaType.MOVIES;
        const durationColumn = hasDuration
            ? (mediaTable as typeof mediaTable & { duration: SQL<number> }).duration
            : sql<number | null>`NULL`;

        return getDbClient()
            .select({
                id: mediaTable.id,
                duration: durationColumn,
            })
            .from(mediaTable)
            .where(inArray(mediaTable.id, uniqueMediaIds));
    }

    async getListFilters(userId: number): Promise<ExpandedListFilters> {
        const { tables: { genreTable, tagTable, listTable }, listQuery: { filterOptions } } = this.repoDefinition;

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

        return { tags, genres, ...Object.fromEntries(specificEntries) };
    }

    async getUserFavorites(userId: number, limit = 7) {
        const { listTable, mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({
                mediaCover: mediaTable.imageCover,
                customCover: listTable.customCover,
                mediaId: sql<number>`${mediaTable.id}`,
                mediaName: sql<string>`${mediaTable.name}`,
            })
            .from(listTable)
            .where(and(eq(listTable.userId, userId), eq(listTable.favorite, true)))
            .leftJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .limit(limit);
    }

    async searchUserListByName(userId: number, query: string, limit = 10) {
        const { listTable, mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .selectDistinct({
                mediaId: mediaTable.id,
                mediaName: mediaTable.name,
                mediaCover: mediaTable.imageCover,
                customCover: listTable.customCover,
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), like(mediaTable.name, `%${query}%`)))
            .orderBy(asc(mediaTable.name))
            .limit(limit);
    }

    async editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
        const { tagTable } = this.repoDefinition.tables;

        const db = getDbClient();

        if (action === TagAction.ADD) {
            const [tagData] = await db
                .insert(tagTable)
                .values({ userId, name: tag.name, mediaId })
                .returning({ name: tagTable.name });

            return tagData satisfies Tag;
        }
        else if (action === TagAction.RENAME) {
            if (!tag.oldName) return;

            const existingTag = db
                .select()
                .from(tagTable)
                .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name)))
                .get();

            if (existingTag) {
                throw new FormattedError("A tag with this name already exists.");
            }

            const [tagData] = await db
                .update(tagTable)
                .set({ name: tag.name })
                .where(and(
                    eq(tagTable.userId, userId),
                    eq(tagTable.name, tag.oldName)
                )).returning({ name: tagTable.name });
            return tagData satisfies Tag;
        }
        else if (action === TagAction.DELETE_ONE) {
            if (!mediaId) return;

            await db
                .delete(tagTable)
                .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name), eq(tagTable.mediaId, mediaId)));
        }
        else if (action === TagAction.DELETE_ALL) {
            await db
                .delete(tagTable)
                .where(and(eq(tagTable.userId, userId), eq(tagTable.name, tag.name)));
        }
    }

    async findById(mediaId: number): Promise<TRepoDef["tables"]["mediaTable"]["$inferSelect"] | undefined> {
        const { mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.id, mediaId))
            .get();
    }

    async findByApiId(apiId: number | string): Promise<TRepoDef["tables"]["mediaTable"]["$inferSelect"] | undefined> {
        const { mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.apiId, apiId))
            .get()
    }

    async findByApiIds(apiIds: (number | string)[]) {
        const { mediaTable } = this.repoDefinition.tables;

        if (apiIds.length === 0) return [];
        const uniqueApiIds = [...new Set(apiIds)];
        const matches: { id: number; apiId: number | string }[] = [];

        for (let offset = 0; offset < uniqueApiIds.length; offset += 300) {
            const chunk = uniqueApiIds.slice(offset, offset + 300);
            const rows = await getDbClient()
                .select({
                    id: sql<number>`${mediaTable.id}`,
                    apiId: sql<number | string>`${mediaTable.apiId}`,
                })
                .from(mediaTable)
                .where(inArray(mediaTable.apiId, chunk));

            matches.push(...rows);
        }

        return matches;
    }

    async findByNames(names: string[]) {
        const { mediaTable } = this.repoDefinition.tables;

        if (names.length === 0) return [];

        const uniqueNames = [...new Set(names.map(name => name.trim().toLowerCase()).filter(Boolean))];
        const matches: { id: number; name: string; releaseDate: string | null }[] = [];
        const lowerNames = sql<string>`lower(trim(${mediaTable.name}))`;

        for (let offset = 0; offset < uniqueNames.length; offset += 300) {
            const chunk = uniqueNames.slice(offset, offset + 300);
            const rows = await getDbClient()
                .select({
                    id: sql<number>`${mediaTable.id}`,
                    name: sql<string>`${mediaTable.name}`,
                    releaseDate: sql<string | null>`${mediaTable.releaseDate}`,
                })
                .from(mediaTable)
                .where(inArray(lowerNames, chunk));

            matches.push(...rows);
        }

        return matches;
    }

    async updateUserMediaDetails(userId: number, mediaId: number, updateData: TRepoDef["tables"]["listTable"]["$inferSelect"]): Promise<TRepoDef["tables"]["listTable"]["$inferSelect"]> {
        const { listTable } = this.repoDefinition.tables;

        const [result] = await getDbClient()
            .update(listTable)
            .set({
                ...updateData,
                lastUpdated: sql`datetime('now')`,
            })
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
            .returning();

        return result;
    }

    async findUserMedia(userId: number | undefined, mediaId: number): Promise<UserMediaWithTags<TRepoDef["tables"]["listTable"]["$inferSelect"]> | null> {
        const { listTable, tagTable } = this.repoDefinition.tables;

        if (!userId) return null;

        const mainUserMediaData = getDbClient()
            .select({
                ...getTableColumns(listTable),
                ratingSystem: user.ratingSystem,
            })
            .from(listTable)
            .innerJoin(user, eq(user.id, listTable.userId))
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
            .get()

        if (!mainUserMediaData) {
            return null;
        }

        const associatedTags = await getDbClient()
            .select({ name: sql<string>`${tagTable.name}` })
            .from(tagTable)
            .where(and(eq(tagTable.mediaId, mediaId), eq(tagTable.userId, userId)))
            .orderBy(asc(tagTable.name));

        if (!associatedTags) {
            return null;
        }

        return {
            ...mainUserMediaData,
            tags: associatedTags,
        };
    }

    async downloadMediaListAsCSV(userId: number): Promise<(TRepoDef["tables"]["listTable"]["$inferSelect"] & ExportMediaList)[] | undefined> {
        const { mediaTable, listTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({
                mediaName: sql<string>`${mediaTable.name}`,
                externalApiId: sql<string>`${mediaTable.apiId}`,
                releaseDate: sql<string | null>`${mediaTable.releaseDate}`,
                ...getTableColumns(listTable),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(eq(listTable.userId, userId));
    }

    async getUserFollowsMediaData(userId: number | undefined, mediaId: number): Promise<UserFollowsMediaData<TRepoDef["tables"]["listTable"]["$inferSelect"]>[]> {
        const { listTable } = this.repoDefinition.tables;

        if (!userId) return [];

        const inFollowsLists = await getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                userMedia: listTable,
                ratingSystem: user.ratingSystem,
            })
            .from(followers)
            .innerJoin(user, eq(user.id, followers.followedId))
            .innerJoin(listTable, eq(listTable.userId, followers.followedId))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, listTable.userId),
                eq(userMediaSettings.mediaType, this.identity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED), eq(listTable.mediaId, mediaId)))
            .orderBy(asc(user.name));

        return inFollowsLists;
    }

    async getMediaCommunityActivity(userId: number | undefined, mediaId: number, search: SearchType) {
        const { tables: { listTable }, communityActivity: { aggregates } } = this.repoDefinition;

        const totalRedo = aggregates.totalRedo ?? sql<number>`0`;
        const totalSpecific = aggregates.totalSpecific ?? sql<number>`0`;
        const totalPlaytime = aggregates.totalPlaytime ?? sql<number>`0`;

        const { page, perPage, offset, limit } = resolvePagination({
            maxPerPage: 50,
            page: search.page,
            defaultPerPage: 8,
            perPage: search.perPage,
        });

        const conditions = and(
            eq(listTable.mediaId, mediaId),
            userId ? inArray(user.privacy, [PrivacyType.PUBLIC, PrivacyType.RESTRICTED]) : eq(user.privacy, PrivacyType.PUBLIC),
        );

        const statsQuery = getDbClient()
            .select({
                totalRedo,
                totalSpecific,
                totalPlaytime,
                total: count(listTable.id),
                averageRating: sql<number | null>`AVG(${listTable.rating})`,
                likedCount: sql<number>`COALESCE(SUM(CASE WHEN ${listTable.favorite} = 1 THEN 1 ELSE 0 END), 0)`,
                completedCount: sql<number>`COALESCE(SUM(CASE WHEN ${listTable.status} = ${Status.COMPLETED} THEN 1 ELSE 0 END), 0)`,
            })
            .from(listTable)
            .innerJoin(user, eq(user.id, listTable.userId))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, listTable.userId),
                eq(userMediaSettings.mediaType, this.identity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(conditions)
            .get();

        const itemsQuery = getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                userMedia: {
                    ...getTableColumns(listTable),
                    comment: sql<string | null>`NULL`,
                },
                ratingSystem: user.ratingSystem,
            })
            .from(listTable)
            .innerJoin(user, eq(user.id, listTable.userId))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.active, true),
                eq(userMediaSettings.userId, listTable.userId),
                eq(userMediaSettings.mediaType, this.identity.mediaType),
            ))
            .where(conditions)
            .orderBy(desc(sql`COALESCE(${listTable.lastUpdated}, ${listTable.addedAt})`))
            .limit(limit)
            .offset(offset);

        const [stats, items] = await Promise.all([statsQuery, itemsQuery]);
        const total = stats?.total ?? 0;

        return {
            page,
            items,
            total,
            perPage,
            pages: Math.ceil(total / perPage),
            stats: {
                total,
                totalRedo: stats?.totalRedo ?? 0,
                likedCount: stats?.likedCount ?? 0,
                totalSpecific: stats?.totalSpecific ?? 0,
                totalPlaytime: stats?.totalPlaytime ?? 0,
                completedCount: stats?.completedCount ?? 0,
                averageRating: stats?.averageRating ?? null,
            } satisfies MediaCommunityActivityStats,
        };
    }

    async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs): Promise<MediaListData<TRepoDef["tables"]["listTable"]["$inferSelect"]>> {
        const { tables: { listTable, mediaTable, tagTable }, listQuery } = this.repoDefinition;

        const { page, perPage, offset, limit } = resolvePagination({
            page: args.page,
            perPage: args.perPage,
        });

        const sortKeyName = resolveSorting(args.sorting, Object.keys(listQuery.sorts), listQuery.defaultSort);
        const selectedSort = listQuery.sorts[sortKeyName];
        const filterArgs = { ...args, currentUserId, userId };

        const allFilters = {
            ...this.baseFilterDefs,
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
    }

    async getTagsView(userId: number, search: SimpleSearch) {
        const { listTable, mediaTable, tagTable } = this.repoDefinition.tables;

        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const searchCondition = search.search ? like(tagTable.name, `%${search.search}%`) : undefined;

        const rankedSq = getDbClient()
            .$with("ranked_data")
            .as(getDbClient()
                .select({
                    tagId: tagTable.id,
                    mediaId: listTable.mediaId,
                    mediaCover: mediaTable.imageCover,
                    tagName: sql<string>`${tagTable.name}`.as("tag_name"),
                    mediaName: sql<string>`${mediaTable.name}`.as("media_name"),
                    rowNumber: sql<number>`row_number() over (
                        partition by ${tagTable.name} 
                        order by ${listTable.lastUpdated} desc
                    )`.as("row_number"),
                    totalCount: sql<number>`count(${tagTable.mediaId}) over (
                        partition by ${tagTable.name}
                    )`.as("total_count"),
                    tagLastActivity: sql<number>`max(${listTable.lastUpdated}) over (
                        partition by ${tagTable.name}
                    )`.as("tags_last_activity"),
                })
                .from(tagTable)
                .leftJoin(mediaTable, eq(tagTable.mediaId, mediaTable.id))
                .leftJoin(listTable, and(eq(tagTable.mediaId, listTable.mediaId), eq(listTable.userId, userId)))
                .where(and(eq(tagTable.userId, userId), searchCondition))
            );

        const [{ total, exactMatch }, items] = await Promise.all([
            getDbClient()
                .select({
                    total: countDistinct(tagTable.name),
                    exactMatch: search.search
                        ? sql<number>`max(case when lower(${tagTable.name}) = lower(${search.search}) then 1 else 0 end)`
                        : sql<number>`0`,
                })
                .from(tagTable)
                .where(and(eq(tagTable.userId, userId), searchCondition))
                .then(([result]) => result),
            getDbClient()
                .with(rankedSq)
                .select({
                    tagId: rankedSq.tagId,
                    tagName: rankedSq.tagName,
                    totalCount: rankedSq.totalCount,
                    medias: sql<{ mediaId: number; mediaName: string; mediaCover: string }[]>`
                        json_group_array(json_object(
                            'mediaId', ${rankedSq.mediaId},
                            'mediaName', ${rankedSq.mediaName},
                            'mediaCover', ${rankedSq.mediaCover}
                        ))`.mapWith((rawString) => {
                        const parsedArray = JSON.parse(rawString);
                        return parsedArray.filter((item: any) => item.mediaId !== null).map((item: any) => ({
                            ...item,
                            mediaCover: mediaTable.imageCover.mapFromDriverValue(item.mediaCover),
                        }))
                    }),
                })
                .from(rankedSq)
                .where(lte(rankedSq.rowNumber, 3))
                .groupBy(sql`${rankedSq.tagName}`)
                .orderBy(desc(rankedSq.tagLastActivity))
                .limit(pagination.limit)
                .offset(pagination.offset),
        ]);

        return {
            total,
            items: items,
            page: pagination.page,
            exactMatch: !!exactMatch,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
        };
    }

    async getUpcomingMedia(userId?: number, maxAWeek?: boolean): Promise<UpComingMedia[]> {
        // If userId undefined, returns all media requiring notification to be sent to their respective users.
        // If userId is defined, returns upcoming media from that user's media list.
        // `maxAWeek` should be true only for userId undefined -> media releasing in next 7 days.

        const { listTable, mediaTable } = this.repoDefinition.tables;

        return getDbClient()
            .select({
                mediaId: mediaTable.id,
                userId: listTable.userId,
                status: listTable.status,
                mediaName: mediaTable.name,
                date: mediaTable.releaseDate,
                imageCover: mediaTable.imageCover,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                notInArray(listTable.status, [Status.DROPPED]),
                userId ? eq(listTable.userId, userId) : undefined,
                maxAWeek ?
                    and(
                        gte(mediaTable.releaseDate, sql`date('now')`),
                        lte(mediaTable.releaseDate, sql`date('now', '+7 days')`),
                    )
                    :
                    or(
                        isNull(mediaTable.releaseDate),
                        gte(mediaTable.releaseDate, sql`date('now')`),
                    )
            )).orderBy(asc(mediaTable.releaseDate));
    }

    // TODO: use the paginate function?
    async getMediaJobDetails(job: JobType, name: string, offset: number, limit = 25, userId?: number) {
        const { tables: { mediaTable, listTable }, jobs } = this.repoDefinition;

        const jobHandler = jobs[job];
        if (!jobHandler) throw notFound();

        const hasUser = !!userId;
        const { sourceTable, nameColumn, mediaIdColumn } = jobHandler;

        let dataQuery = getDbClient()
            .selectDistinct({
                mediaId: mediaTable.id,
                mediaName: mediaTable.name,
                imageCover: mediaTable.imageCover,
                releaseDate: mediaTable.releaseDate,
                inUserList: hasUser
                    ? isNotNull(listTable.userId).mapWith(Boolean).as("inUserList")
                    : sql<boolean>`false`.as("inUserList"),
            })
            .from(mediaTable)
            .$dynamic();

        if (hasUser) {
            dataQuery = dataQuery.leftJoin(listTable, and(
                eq(listTable.userId, userId),
                eq(listTable.mediaId, mediaTable.id),
            ));
        }

        let countQuery = getDbClient()
            .select({ value: countDistinct(mediaTable.id) })
            .from(mediaTable)
            .$dynamic();

        if (sourceTable !== mediaTable) {
            const joinCondition = eq(mediaIdColumn, mediaTable.id);
            dataQuery.innerJoin(sourceTable, joinCondition);
            countQuery.innerJoin(sourceTable, joinCondition);
        }

        const filterCondition = jobHandler.getFilter
            ? jobHandler.getFilter(name)
            : like(nameColumn, `%${name}%`);

        dataQuery = dataQuery.where(filterCondition);
        countQuery = countQuery.where(filterCondition);

        const [totalCount, results] = await Promise.all([
            countQuery.get()?.value ?? 0,
            dataQuery.orderBy(asc(mediaTable.releaseDate))
                .limit(limit)
                .offset(offset)
                .execute(),
        ]);

        return {
            items: results,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
        };
    };

    async getSearchListFilters(userId: number, query: string, job: JobType) {
        const { tables: { listTable }, jobs } = this.repoDefinition;

        const jobHandler = jobs[job];
        if (!jobHandler) throw notFound();

        const { sourceTable, nameColumn, mediaIdColumn, postProcess } = jobHandler;

        const results = await getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(sourceTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaIdColumn))
            .where(and(eq(listTable.userId, userId), like(nameColumn, `%${query}%`)));

        if (postProcess) {
            return postProcess(results);
        }

        return results;
    }

    // --- Admin Functions -------------------------------------------------

    async getUserMediaAddedAndUpdatedForAdmin() {
        const { listTable } = this.repoDefinition.tables;

        const [addedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(gte(listTable.addedAt, sql`date('now', 'start of month')`));

        const [addedLastMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(and(
                gte(listTable.addedAt, sql`date('now', '-1 month', 'start of month')`),
                lt(listTable.addedAt, sql`date('now', 'start of month')`)
            ));

        const [updatedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.mediaId) })
            .from(listTable)
            .where(gte(listTable.lastUpdated, sql`date('now', 'start of month')`));

        return {
            added: {
                thisMonth: addedThisMonth?.count || 0,
                lastMonth: addedLastMonth?.count || 0,
                comparedToLastMonth: (addedThisMonth?.count || 0) - (addedLastMonth?.count || 0),
            },
            updated: {
                thisMonth: updatedThisMonth?.count || 0,
            }
        };
    }

    // --- Abstract Methods -----------------------------------------------------------------

    abstract storeMediaWithDetails(params: any): Promise<number>;

    abstract updateMediaWithDetails(params: any): Promise<boolean>;

    abstract addMediaToUserList(userId: number, media: any, newStatus: Status): Promise<TRepoDef["tables"]["listTable"]["$inferSelect"]>;

    abstract findAllAssociatedDetails(mediaId: number): Promise<(TRepoDef["tables"]["mediaTable"]["$inferSelect"] & AddedMediaDetails) | undefined>;
}


type TListByType = {
    [MediaType.SERIES]: typeof seriesList.$inferSelect;
    [MediaType.ANIME]: typeof animeList.$inferSelect;
    [MediaType.MOVIES]: typeof moviesList.$inferSelect;
    [MediaType.GAMES]: typeof gamesList.$inferSelect;
    [MediaType.BOOKS]: typeof booksList.$inferSelect & { pages: number };
    [MediaType.MANGA]: typeof mangaList.$inferSelect & { chapters: number };
};

export type MediaListDataByType = {
    [K in MediaType]: MediaListData<TListByType[K]>;
};
