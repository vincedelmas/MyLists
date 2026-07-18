import {alias} from "drizzle-orm/sqlite-core";
import {getImageUrl} from "@/lib/utils/image-url";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MovieListArgs, MovieListPage} from "@/lib/contracts/media/lists";
import {MovieCommunityActivityPage} from "@/lib/contracts/media/community";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {JobType, MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";
import {MovieProgressState, movieRedoCount} from "@/lib/server/domain/media/movies/library/movie-progress";
import {and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, ne, notInArray, or, sql, SQL} from "drizzle-orm";
import {
    createLibraryEntry,
    editLibraryTag,
    getLibraryStats,
    recordLibraryActivity,
    recordLibraryChange,
    removeLibraryEntry,
    saveLibraryStats,
    synchronizeLibraryProfileChannel,
    updateLibraryEntry,
} from "@/lib/server/domain/media/shared/library/library-persistence";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    followers,
    libraryChange,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    movieActor,
    movieDetails,
    movieProgress,
    profileMediaChannel,
    user
} from "@/lib/server/database/schema";


export type MovieLibraryEntry = {
    id: number;
    name: string;
    userId: number;
    favorite: boolean;
    catalogItemId: number;
    rating: number | null;
    addedAt: string | null;
    comment: string | null;
    durationMinutes: number;
    updatedAt: string | null;
    customCover: string | null;
    kind: typeof MediaType.MOVIES;
    progress: MovieProgressState;
};


export const MOVIE_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Rating +",
    "Rating -",
    "TMDB Rating +",
    "TMDB Rating -",
    "Release Date +",
    "Release Date -",
    "Recently Added",
    "Recently Modified",
    "Re-Watched",
] as const;


export class MovieLibraryRepository {
    readonly saveStats = saveLibraryStats;
    readonly removeEntry = removeLibraryEntry;
    readonly recordChange = recordLibraryChange;
    readonly recordActivity = recordLibraryActivity;
    readonly updateCommonFields = updateLibraryEntry;

    getStats(userId: number) {
        return getLibraryStats(userId, MediaType.MOVIES);
    }

    synchronizeProfileChannel(userId: number, enabled: boolean, views: number) {
        return synchronizeLibraryProfileChannel(userId, MediaType.MOVIES, enabled, views);
    }

    editTag(params: Omit<Parameters<typeof editLibraryTag>[0], "kind">) {
        return editLibraryTag({ ...params, kind: MediaType.MOVIES });
    }

    async findEntriesByCatalogItem(catalogItemId: number) {
        const owners = await getDbClient()
            .select({ userId: libraryEntry.userId })
            .from(libraryEntry)
            .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .where(eq(libraryEntry.catalogItemId, catalogItemId));

        const entries = await Promise.all(owners.map(({ userId }) => this.findEntry(userId, catalogItemId)));

        return entries.filter((entry): entry is MovieLibraryEntry => !!entry);
    }

    async findEntry(userId: number, catalogItemId: number): Promise<MovieLibraryEntry | undefined> {
        const row = getDbClient()
            .select({
                kind: catalogItem.kind,
                name: catalogItem.name,
                watchCount: movieProgress.watchCount,
                durationMinutes: movieDetails.durationMinutes,
                ...getTableColumns(libraryEntry),
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(libraryEntry.catalogItemId, catalogItemId)))
            .get();

        if (!row || row.kind !== MediaType.MOVIES) return;
        if (row.status !== Status.COMPLETED && row.status !== Status.PLAN_TO_WATCH) return;

        return {
            id: row.id,
            name: row.name,
            userId: row.userId,
            rating: row.rating,
            comment: row.comment,
            addedAt: row.addedAt,
            kind: MediaType.MOVIES,
            favorite: row.favorite,
            updatedAt: row.updatedAt,
            customCover: row.customCover,
            catalogItemId: row.catalogItemId,
            durationMinutes: row.durationMinutes,
            progress: {
                status: row.status,
                watchCount: row.watchCount,
            },
        };
    }

    async getMovieCatalogItem(catalogItemId: number) {
        const row = getDbClient()
            .select({
                id: catalogItem.id,
                kind: catalogItem.kind,
                name: catalogItem.name,
                durationMinutes: movieDetails.durationMinutes,
            }).from(catalogItem)
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId)).get();

        return row?.kind === MediaType.MOVIES ? { ...row, kind: MediaType.MOVIES } : undefined;
    }

    async createEntry(params: {
        userId: number;
        status: Status;
        catalogItemId: number;
        rating?: number | null;
        comment?: string | null;
        addedAt?: string | null;
        favorite?: boolean | null;
        updatedAt?: string | null;
        customCover?: string | null;
        progress: MovieProgressState;
    }) {
        const entryId = await createLibraryEntry({
            rating: params.rating,
            userId: params.userId,
            status: params.status,
            comment: params.comment,
            addedAt: params.addedAt,
            updatedAt: params.updatedAt,
            customCover: params.customCover,
            favorite: params.favorite ?? false,
            catalogItemId: params.catalogItemId,
        });

        await getDbClient()
            .insert(movieProgress)
            .values({
                libraryEntryId: entryId,
                watchCount: params.progress.watchCount,
            });

        return entryId;
    }

    async saveProgress(entryId: number, progress: MovieProgressState) {
        await updateLibraryEntry(entryId, { status: progress.status });

        await getDbClient()
            .update(movieProgress)
            .set({ watchCount: progress.watchCount })
            .where(eq(movieProgress.libraryEntryId, entryId));
    }

    async getUserMediaHistory(userId: number, catalogItemId: number) {
        const rows = await getDbClient()
            .select({
                id: libraryChange.id,
                mediaId: catalogItem.id,
                userId: libraryEntry.userId,
                mediaName: catalogItem.name,
                mediaType: catalogItem.kind,
                payload: libraryChange.payload,
                timestamp: libraryChange.occurredAt,
                updateType: libraryChange.updateType,
            })
            .from(libraryChange)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(catalogItem.id, catalogItemId),
            ))
            .orderBy(desc(libraryChange.occurredAt), desc(libraryChange.id));

        return rows.map((row) => ({
            ...row,
            id: row.id,
            payload: row.payload,
        }));
    }

    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        if (!userId) return null;
        const [entry, owner] = await Promise.all([
            this.findEntry(userId, catalogItemId),
            getDbClient().select({ ratingSystem: user.ratingSystem }).from(user).where(eq(user.id, userId)).get(),
        ]);
        if (!entry || !owner) return null;
        return this.toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        if (!viewerId) return [];
        const followedOwners = await getDbClient()
            .select({ id: user.id, name: user.name, image: user.image, ratingSystem: user.ratingSystem })
            .from(followers)
            .innerJoin(user, eq(user.id, followers.followedId))
            .innerJoin(libraryEntry, and(
                eq(libraryEntry.userId, followers.followedId),
                eq(libraryEntry.catalogItemId, catalogItemId),
            ))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, followers.followedId),
                eq(profileMediaChannel.kind, MediaType.MOVIES),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(eq(followers.followerId, viewerId), eq(followers.status, SocialState.ACCEPTED)))
            .orderBy(asc(user.name));

        const results = await Promise.all(followedOwners.map(async (owner) => {
            const entry = await this.findEntry(owner.id, catalogItemId);
            if (!entry) return;
            return {
                ...owner,
                userMedia: await this.toUserMedia(entry, catalogItemId, owner.ratingSystem, false),
            };
        }));
        return results.filter((result): result is NonNullable<typeof result> => !!result);
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<MovieCommunityActivityPage> {
        const pagination = resolvePagination({ maxPerPage: 50, page: search.page, defaultPerPage: 8, perPage: search.perPage });

        const audienceCondition = viewerId
            ? sql`(
                ${user.privacy} IN (${PrivacyType.PUBLIC}, ${PrivacyType.RESTRICTED})
                OR ${user.id} = ${viewerId}
                OR EXISTS (
                    SELECT 1 FROM ${followers} AS community_follow
                    WHERE community_follow.follower_id = ${viewerId}
                        AND community_follow.followed_id = ${user.id}
                        AND community_follow.status = ${SocialState.ACCEPTED}
                )
            )`
            : eq(user.privacy, PrivacyType.PUBLIC);

        const visibleConditions = and(eq(libraryEntry.catalogItemId, catalogItemId), ne(user.name, "DemoProfile"), audienceCondition);

        const baseQuery = () => getDbClient()
            .select({
                userId: user.id,
                name: user.name,
                image: user.image,
                rating: libraryEntry.rating,
                status: libraryEntry.status,
                ratingSystem: user.ratingSystem,
                favorite: libraryEntry.favorite,
            })
            .from(libraryEntry)
            .innerJoin(user, eq(user.id, libraryEntry.userId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryEntry.userId),
                eq(profileMediaChannel.kind, MediaType.MOVIES),
                eq(profileMediaChannel.enabled, true),
            )).where(visibleConditions);

        const [allRows, pageRows] = await Promise.all([
            baseQuery(),
            baseQuery()
                .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`))
                .limit(pagination.limit)
                .offset(pagination.offset),
        ]);

        const ratings = allRows.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
        const entries = await Promise.all(allRows.map(({ userId }) => this.findEntry(userId, catalogItemId)));

        const total = allRows.length;
        const completeEntries = entries.filter((entry): entry is MovieLibraryEntry => !!entry);

        const items = await Promise.all(pageRows.map(async (row) => {
            const entry = await this.findEntry(row.userId, catalogItemId);
            if (!entry) return;

            const userMedia = await this.toUserMedia(entry, catalogItemId, row.ratingSystem, false);

            return {
                id: row.userId,
                name: row.name,
                image: row.image,
                kind: MediaType.MOVIES,
                ratingSystem: row.ratingSystem,
                userMedia: {
                    ...userMedia,
                    comment: null,
                    kind: MediaType.MOVIES,
                },
            };
        }));

        return {
            total,
            page: pagination.page,
            kind: MediaType.MOVIES,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
            items: items.filter((item): item is NonNullable<typeof item> => !!item),
            stats: {
                total,
                totalPlaytime: 0,
                likedCount: allRows.filter(({ favorite }) => favorite).length,
                completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
                totalSpecific: completeEntries.reduce((sum, entry) => sum + entry.progress.watchCount, 0),
                totalRedo: completeEntries.reduce((sum, entry) => sum + movieRedoCount(entry.progress), 0),
                averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
            },
        };
    }

    async getListHeader(userId: number) {
        const channel = getDbClient()
            .select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel)
            .where(and(
                eq(profileMediaChannel.userId, userId),
                eq(profileMediaChannel.kind, MediaType.MOVIES),
            )).get();

        if (!channel?.enabled) return;

        const stats = getDbClient()
            .select({ timeSpent: libraryStats.timeSpentMinutes })
            .from(libraryStats)
            .where(and(
                eq(libraryStats.userId, userId),
                eq(libraryStats.kind, MediaType.MOVIES),
            )).get();

        return { timeSpent: stats?.timeSpent ?? 0 };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MovieListArgs): Promise<MovieListPage> {
        const ownerId = access.ownerId;
        const { page, perPage, offset, limit } = resolvePagination(args);

        const sorting = resolveSorting(args.sorting, MOVIE_LIST_SORTS, "Title A-Z");
        const conditions = this.buildConditions(currentUserId, ownerId, args);

        const [rows, totalRow] = await Promise.all([
            getDbClient()
                .select({
                    id: libraryEntry.id,
                    mediaId: catalogItem.id,
                    mediaName: catalogItem.name,
                    rating: libraryEntry.rating,
                    status: libraryEntry.status,
                    userId: libraryEntry.userId,
                    catalogItemId: catalogItem.id,
                    addedAt: libraryEntry.addedAt,
                    comment: libraryEntry.comment,
                    favorite: libraryEntry.favorite,
                    ratingSystem: user.ratingSystem,
                    imageCover: catalogItem.imageCover,
                    lastUpdated: libraryEntry.updatedAt,
                    watchCount: movieProgress.watchCount,
                    customCover: libraryEntry.customCover,
                })
                .from(libraryEntry)
                .innerJoin(user, eq(user.id, libraryEntry.userId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
                .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions))
                .orderBy(...this.sortExpressions(sorting))
                .limit(limit)
                .offset(offset),
            getDbClient()
                .select({ value: count() })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
                .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions))
                .get(),
        ]);

        const items = await this.hydrateItems(rows, currentUserId, ownerId);
        const totalItems = totalRow?.value ?? 0;

        return {
            items,
            kind: MediaType.MOVIES,
            pagination: {
                page,
                perPage,
                sorting,
                totalItems,
                availableSorting: [...MOVIE_LIST_SORTS],
                totalPages: Math.ceil(totalItems / perPage),
            },
        };
    }

    async getListFilters(access: MediaListAccessScope) {
        const ownerId = access.ownerId;
        const [genres, tags, langs] = await Promise.all([
            getDbClient()
                .selectDistinct({ name: catalogGenre.name })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.MOVIES)))
                .orderBy(asc(catalogGenre.name)),
            getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryTag)
                .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, MediaType.MOVIES)))
                .orderBy(asc(libraryTag.name)),
            getDbClient()
                .selectDistinct({ name: movieDetails.originalLanguage })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.MOVIES),
                    isNotNull(movieDetails.originalLanguage),
                ))
                .orderBy(asc(movieDetails.originalLanguage)),
        ]);
        return { kind: MediaType.MOVIES, genres, tags, langs: langs as { name: string }[] };
    }

    async getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        const ownerId = access.ownerId;

        if (job === JobType.ACTOR) {
            return getDbClient()
                .selectDistinct({ name: movieActor.name })
                .from(movieActor)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, movieActor.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.MOVIES),
                    like(movieActor.name, `%${query}%`),
                ));
        }
        if (job === JobType.CREATOR) {
            return getDbClient()
                .selectDistinct({ name: movieDetails.directorName })
                .from(movieDetails)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, movieDetails.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.MOVIES),
                    like(movieDetails.directorName, `%${query}%`),
                )) as Promise<{ name: string }[]>;
        }

        return [];
    }

    async getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        const ownerId = access.ownerId;
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const tagRows = await getDbClient()
            .select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.userId, ownerId),
                eq(libraryTag.kind, MediaType.MOVIES),
                search.search ? like(libraryTag.name, `%${search.search}%`) : undefined,
            ));
        const linkedByTag = await Promise.all(tagRows.map(async (tag) => {
            const medias = await getDbClient()
                .select({
                    mediaId: catalogItem.id,
                    mediaName: catalogItem.name,
                    mediaCover: catalogItem.imageCover,
                    activity: sql<string>`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`,
                })
                .from(libraryEntryTag)
                .innerJoin(libraryEntry, eq(libraryEntry.id, libraryEntryTag.libraryEntryId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(eq(libraryEntryTag.tagId, tag.id))
                .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`));
            return {
                tagId: tag.id,
                tagName: tag.name,
                totalCount: medias.length,
                lastActivity: medias[0]?.activity ?? "",
                medias: medias.slice(0, 3).map(({ activity: _, mediaCover, ...media }) => ({
                    ...media,
                    mediaCover: getImageUrl("movies-covers", mediaCover),
                })),
            };
        }));
        linkedByTag.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity) || a.tagName.localeCompare(b.tagName));
        const items = linkedByTag
            .slice(pagination.offset, pagination.offset + pagination.limit)
            .map(({ lastActivity: _, ...tag }) => tag);
        const exactMatch = !!search.search && tagRows.some(({ name }) => name.toLowerCase() === search.search!.toLowerCase());
        return {
            total: tagRows.length,
            items,
            page: pagination.page,
            exactMatch,
            perPage: pagination.perPage,
            pages: Math.ceil(tagRows.length / pagination.perPage),
        };
    }

    getTagNames(userId: number) {
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, MediaType.MOVIES)))
            .orderBy(asc(libraryTag.name));
    }

    async getUpcomingMedia(access: MediaListAccessScope) {
        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                userId: libraryEntry.userId,
                status: libraryEntry.status,
                mediaName: catalogItem.name,
                date: catalogItem.releaseDate,
                imageCover: catalogItem.imageCover,
            })
            .from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(libraryEntry.userId, access.ownerId),
                or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now')`)),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("movies-covers", imageCover),
            })));
    }

    private async toUserMedia(entry: MovieLibraryEntry, catalogItemId: number, ratingSystem: typeof user.$inferSelect.ratingSystem, includeTags: boolean) {
        const tags = includeTags
            ? await getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(eq(libraryEntryTag.libraryEntryId, entry.id))
                .orderBy(asc(libraryTag.name))
            : undefined;

        const userMedia = {
            id: entry.id,
            userId: entry.userId,
            rating: entry.rating,
            mediaId: catalogItemId,
            addedAt: entry.addedAt,
            comment: entry.comment,
            favorite: entry.favorite,
            lastUpdated: entry.updatedAt,
            status: entry.progress.status,
            watchCount: entry.progress.watchCount,
            rewatchCount: movieRedoCount(entry.progress),
            customCover: entry.customCover ? getImageUrl("movies-covers", entry.customCover) : null,
        };

        return { ...userMedia, ratingSystem, tags: tags ?? [] };
    }

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: MovieListArgs) {
        const conditions: SQL[] = [
            eq(libraryEntry.userId, ownerId),
            eq(catalogItem.kind, MediaType.MOVIES),
        ];

        if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
        if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
        if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
        if (args.status?.length) conditions.push(inArray(libraryEntry.status, args.status));
        if (args.langs?.length) conditions.push(inArray(movieDetails.originalLanguage, args.langs));
        if (args.directors?.length) conditions.push(inArray(movieDetails.directorName, args.directors));
        if (args.tags?.length) {
            conditions.push(inArray(libraryEntry.id, getDbClient()
                .select({ libraryEntryId: libraryEntryTag.libraryEntryId })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryTag.name, args.tags))));
        }
        if (args.genres?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: catalogItemGenre.catalogItemId })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(inArray(catalogGenre.name, args.genres))));
        }
        if (args.actors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: movieActor.catalogItemId })
                .from(movieActor)
                .where(inArray(movieActor.name, args.actors))));
        }
        if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
            const currentEntry = alias(libraryEntry, "current_movie_library_entry");
            conditions.push(notInArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry)
                .where(eq(currentEntry.userId, currentUserId))));
        }

        return conditions;
    }

    private sortExpressions(sorting: typeof MOVIE_LIST_SORTS[number]): SQL[] {
        const name = asc(catalogItem.name);
        const itemId = asc(catalogItem.id);
        const rewatches = sql<number>`CASE WHEN ${libraryEntry.status} = 'Completed' THEN MAX(${movieProgress.watchCount} - 1, 0) ELSE 0 END`;
        const sorts: Record<typeof sorting, SQL[]> = {
            "Title A-Z": [name, itemId],
            "Title Z-A": [desc(catalogItem.name), itemId],
            "Rating +": [desc(libraryEntry.rating), name, itemId],
            "Rating -": [asc(libraryEntry.rating), name, itemId],
            "TMDB Rating +": [desc(movieDetails.voteAverage), name, itemId],
            "TMDB Rating -": [asc(movieDetails.voteAverage), name, itemId],
            "Release Date +": [desc(catalogItem.releaseDate), name, itemId],
            "Release Date -": [sql`${catalogItem.releaseDate} ASC NULLS LAST`, name, itemId],
            "Recently Added": [desc(libraryEntry.addedAt), name, itemId],
            "Recently Modified": [desc(libraryEntry.updatedAt), name, itemId],
            "Re-Watched": [desc(rewatches), name, itemId],
        };
        return sorts[sorting];
    }

    private async hydrateItems<TRow extends {
        id: number;
        status: Status;
        watchCount: number;
        imageCover: string;
        catalogItemId: number;
        customCover: string | null;
    }>(rows: TRow[], currentUserId: number | undefined, ownerId: number) {
        if (rows.length === 0) return [];

        const entryIds = rows.map(({ id }) => id);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);

        const [tags, commonEntries] = await Promise.all([
            getDbClient()
                .select({
                    id: libraryTag.id,
                    name: libraryTag.name,
                    libraryEntryId: libraryEntryTag.libraryEntryId,
                })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryEntryTag.libraryEntryId, entryIds))
                .orderBy(asc(libraryTag.name)),
            currentUserId && currentUserId !== ownerId
                ? getDbClient()
                    .select({ catalogItemId: libraryEntry.catalogItemId })
                    .from(libraryEntry)
                    .where(and(eq(libraryEntry.userId, currentUserId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
                : [],
        ]);

        const commonIds = new Set(commonEntries.map(({ catalogItemId }) => catalogItemId));

        return rows.map(({ catalogItemId, watchCount, imageCover, customCover, ...row }) => {
            if (row.status !== Status.COMPLETED && row.status !== Status.PLAN_TO_WATCH) {
                throw new Error(`Invalid movie library status: ${row.status}`);
            }

            const progress = {
                watchCount,
                status: row.status === Status.COMPLETED ? Status.COMPLETED : Status.PLAN_TO_WATCH,
            };

            return {
                ...row,
                watchCount,
                kind: MediaType.MOVIES,
                common: commonIds.has(catalogItemId),
                rewatchCount: movieRedoCount(progress),
                imageCover: getImageUrl("movies-covers", customCover ?? imageCover),
                customCover: customCover ? getImageUrl("movies-covers", customCover) : null,
                tags: tags.filter((tag) => tag.libraryEntryId === row.id).map(({ id, name: tagName }) => {
                    return ({ id, name: tagName });
                }),
            };
        });
    }
}
