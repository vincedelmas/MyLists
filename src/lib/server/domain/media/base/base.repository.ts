import {notFound} from "@tanstack/react-router";
import {statusUtils} from "@/lib/utils/media-mapping";
import {MediaInfo} from "@/lib/types/activity.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {TopAffinityConfig} from "@/lib/types/stats.types";
import {Achievement} from "@/lib/types/achievements.types";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {MediaSchemaConfig} from "@/lib/types/media.config.types";
import {AddedMediaDetails, Tag} from "@/lib/types/media-common.types";
import {MediaListArgs, SearchType, SimpleSearch} from "@/lib/schemas";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {JobType, MediaType, PrivacyType, SocialState, Status, TagAction} from "@/lib/utils/enums";
import {MediaCommunityActivityStats, UserFollowsMediaData, UserMediaStats, UserMediaWithTags} from "@/lib/types/user-media.types";
import {animeList, booksList, collectionItems, followers, gamesList, mangaList, moviesList, seriesList, user} from "@/lib/server/database/schema";
import {ExpandedListFilters, FilterDefinition, FilterDefinitions, ListFilterDefinition, MediaListData} from "@/lib/types/media-list.types";
import {and, asc, count, countDistinct, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, lt, lte, ne, notExists, notInArray, or, SQL, sql} from "drizzle-orm";


const SIMILAR_MAX_GENRES = 10;


export abstract class BaseRepository<TConfig extends MediaSchemaConfig> {
    readonly config: TConfig;
    protected readonly baseFilterDefs: FilterDefinitions;

    protected constructor(config: TConfig) {
        this.config = config;
        this.baseFilterDefs = this.baseListFiltersDefs();
    }

    private baseListFiltersDefs = (): FilterDefinitions => {
        const { listTable, mediaTable, tagTable, genreTable } = this.config;

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
            status: createArrayFilterDef({
                argName: "status",
                mediaTable: mediaTable,
                filterColumn: listTable.status,
            }),
            tags: createArrayFilterDef({
                argName: "tags",
                mediaTable: mediaTable,
                entityTable: tagTable,
                filterColumn: tagTable.name,
            }),
            genres: createArrayFilterDef({
                argName: "genres",
                mediaTable: mediaTable,
                entityTable: genreTable,
                filterColumn: genreTable.name,
            }),
        };
    }

    async getCoverFilenames() {
        const { mediaTable } = this.config;

        return getDbClient()
            .select({ imageCover: mediaTable.imageCover })
            .from(mediaTable);
    }

    async getCustomCoverFilenames() {
        const { listTable } = this.config;

        return getDbClient()
            .select({ customCover: listTable.customCover })
            .from(listTable)
            .where(isNotNull(listTable.customCover));
    }

    async getOrphanedMediaIds(mediaType: MediaType) {
        const { mediaTable, listTable } = this.config;

        const tx = getDbClient();
        const mediaToDelete = await tx
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .leftJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                isNull(listTable.userId),
                notExists(tx.select()
                    .from(collectionItems)
                    .where(and(eq(collectionItems.mediaId, mediaTable.id), eq(collectionItems.mediaType, mediaType)))
                )
            ));

        return mediaToDelete.map((media) => media.id);
    }

    async getTagNames(userId: number) {
        const { tagTable } = this.config;

        return getDbClient()
            .selectDistinct({ name: sql<string>`${tagTable.name}` })
            .from(tagTable)
            .where(eq(tagTable.userId, userId))
            .orderBy(asc(tagTable.name));
    }

    async removeMediaByIds(mediaIds: number[]) {
        const { mediaTable, tablesForDeletion } = this.config;

        // Delete on other tables
        for (const table of tablesForDeletion) {
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
        const { mediaTable } = this.config;

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
        const { mediaTable, mediaType } = this.config;

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
        const { listTable, tagTable } = this.config;

        await getDbClient()
            .delete(listTable)
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)));

        await getDbClient()
            .delete(tagTable)
            .where(and(eq(tagTable.userId, userId), eq(tagTable.mediaId, mediaId)));
    }

    async findSimilarMedia(mediaId: number) {
        const { mediaTable, genreTable } = this.config;

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
        const { mediaTable, listTable } = this.config;

        return getDbClient()
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
            .where(inArray(mediaTable.id, mediaIds)) as unknown as MediaInfo[];
    }

    async getCommonListFilters(userId: number) {
        const { genreTable, tagTable, listTable } = this.config;

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

        return { genres, tags };
    }

    async getUserFavorites(userId: number, limit = 7) {
        const { listTable, mediaTable } = this.config;

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
        const { listTable, mediaTable } = this.config;

        return getDbClient()
            .selectDistinct({
                mediaCover: mediaTable.imageCover,
                mediaId: sql<number>`${mediaTable.id}`,
                mediaName: sql<string>`${mediaTable.name}`,
                customCover: sql<string>`${listTable.customCover}`,
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), like(mediaTable.name, `%${query}%`)))
            .orderBy(asc(mediaTable.name))
            .limit(limit);
    }

    async editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
        const db = getDbClient();
        const { tagTable } = this.config;

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

    async findById(mediaId: number): Promise<TConfig["mediaTable"]["$inferSelect"] | undefined> {
        const { mediaTable } = this.config;

        const result = getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.id, mediaId))
            .get();

        return result;
    }

    async findByApiId(apiId: number | string): Promise<TConfig["mediaTable"]["$inferSelect"] | undefined> {
        const { mediaTable } = this.config;

        const result = getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.apiId, apiId))
            .get()

        return result;
    }

    async updateUserMediaDetails(userId: number, mediaId: number, updateData: TConfig["listTable"]["$inferSelect"]): Promise<TConfig["listTable"]["$inferSelect"]> {
        const { listTable } = this.config;

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

    async findUserMedia(userId: number | undefined, mediaId: number): Promise<UserMediaWithTags<TConfig["listTable"]["$inferSelect"]> | null> {
        const { listTable, tagTable } = this.config;

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

    async downloadMediaListAsCSV(userId: number): Promise<(TConfig["listTable"]["$inferSelect"] & { mediaName: string, apiId: string | number })[] | undefined> {
        const { mediaTable, listTable } = this.config;

        const data = await getDbClient()
            .select({
                apiId: sql<string>`${mediaTable.apiId}`,
                mediaName: sql<string>`${mediaTable.name}`,
                ...getTableColumns(listTable),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(eq(listTable.userId, userId));

        return data;
    }

    async getUserFollowsMediaData(userId: number | undefined, mediaId: number): Promise<UserFollowsMediaData<TConfig["listTable"]["$inferSelect"]>[]> {
        const { listTable } = this.config;

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
            .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED), eq(listTable.mediaId, mediaId)))
            .orderBy(asc(user.name));

        return inFollowsLists;
    }

    async getMediaCommunityActivity(userId: number | undefined, mediaId: number, search: SearchType) {
        const { listTable } = this.config;
        const communityStats = this.config.communityActivityStats;
        const totalRedo = communityStats.totalRedo ?? sql<number>`0`;
        const totalSpecific = communityStats.totalSpecific ?? sql<number>`0`;
        const totalPlaytime = communityStats.totalPlaytime ?? sql<number>`0`;

        const { page, perPage, offset, limit } = resolvePagination({
            maxPerPage: 50,
            page: search.page,
            defaultPerPage: 8,
            perPage: search.perPage,
        });

        const conditions = and(
            eq(listTable.mediaId, mediaId),
            ne(user.name, "DemoProfile"),
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

    async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs): Promise<MediaListData<TConfig["listTable"]["$inferSelect"]>> {
        const { listTable, mediaTable, tagTable, mediaList } = this.config;

        const { page, perPage, offset, limit } = resolvePagination({ page: args.page, perPage: args.perPage });

        const sortKeyName = resolveSorting(args.sorting, Object.keys(mediaList.availableSorts), mediaList.defaultSortName);
        const selectedSort = mediaList.availableSorts[sortKeyName];
        const filterArgs = { ...args, currentUserId, userId };

        const allFilters = {
            ...this.baseFilterDefs,
            ...mediaList.filterDefinitions,
        };

        // Main query builder
        let queryBuilder = getDbClient()
            .select({
                ...mediaList.baseSelection,
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

        // Process results - add `common` field and replace `imageCover` by user's `customCover`
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
                availableSorting: Object.keys(mediaList.availableSorts),
            },
        };
    }

    async getTagsView(userId: number, search: SimpleSearch) {
        const { listTable, mediaTable, tagTable } = this.config;

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

        const { listTable, mediaTable } = this.config;

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
            ))
            .orderBy(asc(mediaTable.releaseDate));
    }

    // TODO: use the paginate function?
    async getMediaJobDetails(job: JobType, name: string, offset: number, limit = 25, userId?: number) {
        const { mediaTable, listTable, jobDefinitions } = this.config;

        const jobHandler = jobDefinitions[job];
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
            dataQuery = dataQuery.leftJoin(listTable, and(eq(listTable.mediaId, mediaTable.id), eq(listTable.userId, userId)));
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

        const filterCondition = jobHandler.getFilter ? jobHandler.getFilter(name) : like(nameColumn, `%${name}%`);
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
        const { listTable, jobDefinitions } = this.config;

        const jobHandler = jobDefinitions[job];
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

    protected async _computeAllUsersStats(timeSpentStat: SQL, totalSpecificStat: SQL, totalRedoStat?: SQL) {
        const { listTable, mediaTable, mediaType } = this.config;

        const redoStat = totalRedoStat ?? (listTable?.redo ? sql`COALESCE(SUM(${listTable.redo}), 0)` : sql`0`);

        const results = await getDbClient()
            .select({
                userId: listTable.userId,
                timeSpent: timeSpentStat.as("timeSpent"),
                totalSpecific: totalSpecificStat.as("totalSpecific"),
                statusCounts: sql`
                    COALESCE((
                        SELECT 
                            JSON_GROUP_OBJECT(status, count_per_status) 
                        FROM (
                            SELECT 
                                status,
                                COUNT(*) as count_per_status 
                            FROM ${listTable} as sub_list 
                            WHERE sub_list.user_id = ${listTable.userId} GROUP BY status
                        )
                    ), '{}')
                `.as("statusCounts"),
                entriesFavorites: sql<number>`
                    COALESCE(SUM(CASE WHEN ${listTable.favorite} = 1 THEN 1 ELSE 0 END), 0)
                `.as("entriesFavorites"),
                totalRedo: redoStat.as("totalRedo"),
                entriesCommented: sql<number>`
                    COALESCE(SUM(CASE WHEN LENGTH(TRIM(COALESCE(${listTable.comment}, ''))) > 0 THEN 1 ELSE 0 END), 0)
                `.as("entriesCommented"),
                totalEntries: count(listTable.mediaId).as("totalEntries"),
                entriesRated: count(listTable.rating).as("entriesRated"),
                sumEntriesRated: sql<number>`COALESCE(SUM(${listTable.rating}), 0)`.as("sumEntriesRated"),
                averageRating: sql<number>`
                    COALESCE(SUM(${listTable.rating}) * 1.0 / NULLIF(COUNT(${listTable.rating}), 0), 0.0)
                `.as("averageRating"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .groupBy(listTable.userId);

        const expectedStatuses = statusUtils.byMediaType(mediaType) ?? [];

        return results.map((row) => {
            let parsed: unknown = row.statusCounts;

            if (typeof parsed === "string") {
                try {
                    parsed = JSON.parse(parsed);
                }
                catch (err) {
                    parsed = {};
                    console.error(`Failed to parse statusCounts for user ${row.userId}:`, row.statusCounts, err);
                }
            }

            const parsedObj = (parsed && typeof parsed === "object") ? (parsed as Record<Status, number>) : {} as Record<Status, number>;

            const statusCounts = expectedStatuses.reduce<Record<Status, number>>((acc, status) => {
                const v = parsedObj[status];
                acc[status] = typeof v === "number" && Number.isFinite(v) ? v : 0;
                return acc;
            }, {} as Record<Status, number>);

            return {
                userId: row.userId,
                statusCounts: statusCounts,
                timeSpent: Number(row.timeSpent) || 0,
                totalRedo: Number(row.totalRedo) || 0,
                totalEntries: Number(row.totalEntries) || 0,
                entriesRated: Number(row.entriesRated) || 0,
                totalSpecific: Number(row.totalSpecific) || 0,
                averageRating: Number(row.averageRating) || 0,
                sumEntriesRated: Number(row.sumEntriesRated) || 0,
                entriesFavorites: Number(row.entriesFavorites) || 0,
                entriesCommented: Number(row.entriesCommented) || 0,
            };
        });
    }

    // --- Admin Functions -------------------------------------------------

    async getUserMediaAddedAndUpdatedForAdmin() {
        const { listTable } = this.config;

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

    // --- Achievements ----------------------------------------------------

    specificGenreAchievementCte(achievement: Achievement, userId?: number) {
        const { mediaTable, listTable, genreTable } = this.config;

        const baseCTE = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .innerJoin(genreTable, eq(mediaTable.id, genreTable.mediaId));

        const conditions = [eq(listTable.status, Status.COMPLETED), eq(genreTable.name, achievement.value)];

        return this.applyWhereConditionsAndGrouping(baseCTE, conditions, userId);
    }

    countAchievementCte(condition: SQL, _achievement: Achievement, userId?: number) {
        const { listTable } = this.config;

        const baseCTE = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            }).from(listTable);

        return this.applyWhereConditionsAndGrouping(baseCTE, [condition], userId);
    }

    applyWhereConditionsAndGrouping(cte: any, baseConditions: SQL[], userId?: number) {
        const { listTable } = this.config;
        const conditions = userId ? [...baseConditions, eq(listTable.userId, userId)] : [...baseConditions];

        return cte.where(and(...conditions))
            .groupBy(listTable.userId)
            .as("calculation");
    }

    // --- Advanced Stats ---------------------------------------------------

    async computeRatingStats(userId?: number) {
        const { listTable } = this.config;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const rows = await getDbClient()
            .select({
                rating: listTable.rating,
                count: count(listTable.rating),
            })
            .from(listTable)
            .where(and(forUser, isNotNull(listTable.rating)))
            .groupBy(listTable.rating)
            .orderBy(asc(listTable.rating));

        const buckets = Array.from({ length: 21 }, (_, i) => ({
            name: (i * 0.5).toFixed(1),
            value: 0,
        }));

        for (const r of rows) {
            if (r.rating == null) continue;
            const idx = Math.round(Number(r.rating) * 2);
            if (idx >= 0 && idx < buckets.length) buckets[idx].value = r.count;
        }

        return buckets;
    }

    async computeReleaseDateStats(userId?: number) {
        const { mediaTable, listTable } = this.config;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const decadeExpression = sql<number>`(CAST(strftime('%Y', ${mediaTable.releaseDate}) AS INTEGER) / 10) * 10`;

        const releaseDates = await getDbClient()
            .select({
                name: decadeExpression,
                value: sql<number>`COUNT(${mediaTable.id})`,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, isNotNull(mediaTable.releaseDate)))
            .groupBy(decadeExpression)
            .orderBy(asc(decadeExpression));

        return releaseDates;
    }

    async computeTotalTags(userId?: number) {
        const { tagTable } = this.config;
        const forUser = userId ? eq(tagTable.userId, userId) : undefined;

        const result = getDbClient()
            .select({ count: countDistinct(tagTable.name) })
            .from(tagTable)
            .where(and(forUser))
            .get();

        return result?.count ?? 0;
    }

    async computeTopGenresStats(mediaAvgRating: number | null, userId?: number) {
        const { genreTable, listTable } = this.config;

        const metricStatsConfig = {
            metricTable: genreTable,
            metricNameCol: genreTable.name,
            metricIdCol: genreTable.mediaId,
            mediaLinkCol: listTable.mediaId,
            filters: [notInArray(listTable.status, [Status.PLAN_TO_WATCH, Status.PLAN_TO_PLAY, Status.PLAN_TO_READ])],
        };

        return this.computeTopAffinityStats(metricStatsConfig, mediaAvgRating, userId);
    }

    async computeTopAffinityStats(statsConfig: TopAffinityConfig, mediaAvgRating: number | null, userId?: number) {
        const { mediaTable, listTable } = this.config;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;
        const { metricTable, metricIdCol, metricNameCol, mediaLinkCol, filters, limit = 10, minRatingCount = 3 } = statsConfig;

        const isDifferentTable = metricTable !== mediaTable && metricTable !== listTable;

        const userAvg = mediaAvgRating ?? 5;

        // Define raw aggregate aliases
        const entriesCountSql = sql<number>`CAST(COUNT(${metricNameCol}) AS FLOAT)`;
        const avgRatingSql = sql<number>`COALESCE(AVG(${listTable.rating}), ${userAvg})`;
        const favoriteCountSql = sql<number>`CAST(SUM(CASE WHEN ${listTable.favorite} = true THEN 1 ELSE 0 END) AS FLOAT)`;

        const qualityFactor = sql`(${avgRatingSql} / NULLIF(${userAvg}, 0))`;
        const favoriteBoost = sql`(1 + (${favoriteCountSql} / NULLIF(${entriesCountSql}, 0)))`;
        const confidence = sql`LN(${entriesCountSql} + 1) / 3`;

        const affinityExpr = sql<number>`
            10 * (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) - 1) / 
                 (EXP(2 * (${qualityFactor} * ${favoriteBoost} * ${confidence})) + 1)
            `;

        let builder = getDbClient()
            .select({
                affinity: affinityExpr,
                avgRating: avgRatingSql,
                entriesCount: entriesCountSql,
                favoriteCount: favoriteCountSql,
                name: sql<string>`${metricNameCol}`,
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .$dynamic();

        if (isDifferentTable) {
            builder = builder.innerJoin(metricTable, eq(mediaLinkCol, metricIdCol));
        }

        const results = await builder
            .where(and(forUser, isNotNull(metricNameCol), ...filters))
            .groupBy(metricNameCol)
            .having(gte(sql`COUNT(${metricNameCol})`, minRatingCount))
            .orderBy(desc(affinityExpr))
            .limit(limit);

        return results.map((row) => ({
            name: row.name,
            value: Number(row.affinity).toFixed(2),
            metadata: {
                entriesCount: Number(row.entriesCount),
                favoriteCount: Number(row.favoriteCount),
                avgRating: Number(row.avgRating).toFixed(2),
            },
        }));
    }

    // --- Abstract Methods -----------------------------------------------------------------

    abstract computeAllUsersStats(): Promise<UserMediaStats[]>;

    abstract storeMediaWithDetails(params: any): Promise<number>;

    abstract updateMediaWithDetails(params: any): Promise<boolean>;

    abstract getListFilters(userId: number): Promise<ExpandedListFilters>;

    abstract addMediaToUserList(userId: number, media: any, newStatus: Status): Promise<TConfig["listTable"]["$inferSelect"]>;

    abstract findAllAssociatedDetails(mediaId: number): Promise<(TConfig["mediaTable"]["$inferSelect"] & AddedMediaDetails) | undefined>;
}


const isValidFilter = <T>(value: T) => {
    return Array.isArray(value) && value.length > 0;
}


export const createArrayFilterDef = ({ argName, entityTable, filterColumn, mediaTable }: ListFilterDefinition): FilterDefinition => {
    return {
        isActive: (args: MediaListArgs) => isValidFilter(args[argName]),
        getCondition: (args: MediaListArgs) => {
            const dataArray = args[argName] as string[];

            // If no entityTable provided, filter directly on mediaTable
            if (!entityTable) {
                return inArray(filterColumn, dataArray);
            }

            // Otherwise, subquery for relational filtering
            const subQuery = getDbClient()
                .select({ mediaId: entityTable.mediaId })
                .from(entityTable)
                .where(inArray(filterColumn, dataArray));

            return inArray(mediaTable.id, subQuery);
        },
    };
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
