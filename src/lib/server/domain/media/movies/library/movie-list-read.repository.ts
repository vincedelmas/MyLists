import {SimpleSearch} from "@/lib/schemas";
import {alias} from "drizzle-orm/sqlite-core";
import {getImageUrl} from "@/lib/utils/image-url";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MovieListArgs, MovieListPage} from "@/lib/contracts/media/lists";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {movieRedoCount} from "@/lib/server/domain/media/movies/library/movie-progress";
import {and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, like, lte, notInArray, or, SQL, sql} from "drizzle-orm";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    movieActor,
    movieDetails,
    movieProgress,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";


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


export class MovieListReadRepository {
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
                    catalogItemId: catalogItem.id,
                    id: libraryEntry.id,
                    userId: libraryEntry.userId,
                    mediaId: catalogItem.id,
                    status: libraryEntry.status,
                    favorite: libraryEntry.favorite,
                    comment: libraryEntry.comment,
                    rating: libraryEntry.rating,
                    customCover: libraryEntry.customCover,
                    addedAt: libraryEntry.addedAt,
                    lastUpdated: libraryEntry.updatedAt,
                    watchCount: movieProgress.watchCount,
                    mediaName: catalogItem.name,
                    imageCover: catalogItem.imageCover,
                    ratingSystem: user.ratingSystem,
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
            kind: MediaType.MOVIES,
            items,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil(totalItems / perPage),
                totalItems,
                sorting,
                availableSorting: [...MOVIE_LIST_SORTS],
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

    getUpcomingMedia(access: MediaListAccessScope) {
        return this.queryUpcomingMedia(access.ownerId, false);
    }

    getUpcomingMediaForNotifications() {
        return this.queryUpcomingMedia(undefined, true);
    }

    private queryUpcomingMedia(ownerId: number | undefined, maxAWeek: boolean) {
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
                ownerId !== undefined ? eq(libraryEntry.userId, ownerId) : undefined,
                maxAWeek
                    ? and(gte(catalogItem.releaseDate, sql`date('now')`), lte(catalogItem.releaseDate, sql`date('now', '+7 days')`))
                    : or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now')`)),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("movies-covers", imageCover),
            })));
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
        catalogItemId: number;
        id: number;
        status: Status;
        watchCount: number;
        imageCover: string;
        customCover: string | null;
    }>(rows: TRow[], currentUserId: number | undefined, ownerId: number) {
        if (rows.length === 0) return [];
        const entryIds = rows.map(({ id }) => id);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
        const [tags, commonEntries] = await Promise.all([
            getDbClient()
                .select({ libraryEntryId: libraryEntryTag.libraryEntryId, id: libraryTag.id, name: libraryTag.name })
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
                status: row.status === Status.COMPLETED ? Status.COMPLETED : Status.PLAN_TO_WATCH,
                watchCount,
            };
            return {
                ...row,
                kind: MediaType.MOVIES,
                customCover: customCover ? getImageUrl("movies-covers", customCover) : null,
                imageCover: getImageUrl("movies-covers", customCover ?? imageCover),
                rewatchCount: movieRedoCount(progress),
                watchCount,
                tags: tags.filter((tag) => tag.libraryEntryId === row.id).map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }
}
