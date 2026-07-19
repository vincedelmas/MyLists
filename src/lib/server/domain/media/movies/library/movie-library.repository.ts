import {getImageUrl} from "@/lib/utils/image-url";
import {SearchType} from "@/lib/schemas";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MovieListArgs, MovieListPage} from "@/lib/contracts/media/lists";
import {MovieCommunityActivityPage} from "@/lib/contracts/media/community";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {MovieProgressState, movieRedoCount} from "@/lib/server/domain/media/movies/library/movie-progress";
import {and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, or, sql, SQL} from "drizzle-orm";
import {getLibraryCommunityActivity} from "@/lib/server/domain/media/shared/library/library-community-activity";
import {
    findFollowedUsersLibraryMedia,
    findLibraryEntriesByCatalogItem,
    findLibraryUserMedia,
    getCommonLibraryListConditions,
    getLibraryEntryTags,
    getLibraryGenresAndTags,
    getLibraryListItemRelations,
} from "@/lib/server/domain/media/shared/library/library-shared-queries";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {catalogItem, libraryEntry, movieActor, movieDetails, movieProgress, user} from "@/lib/server/database/schema";


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
    constructor(private readonly common = new CommonLibraryRepository(MediaType.MOVIES)) {
    }

    async findEntriesByCatalogItem(catalogItemId: number) {
        return findLibraryEntriesByCatalogItem(
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId)
        );
    }

    async findEntry(userId: number, catalogItemId: number) {
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
        const entryId = await this.common.createEntry({
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
        await this.common.updateEntry(entryId, { status: progress.status });

        await getDbClient()
            .update(movieProgress)
            .set({ watchCount: progress.watchCount })
            .where(eq(movieProgress.libraryEntryId, entryId));
    }

    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        return findLibraryUserMedia(
            userId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        return findFollowedUsersLibraryMedia(
            MediaType.MOVIES,
            viewerId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<MovieCommunityActivityPage> {
        return getLibraryCommunityActivity({
            search,
            viewerId,
            catalogItemId,
            kind: MediaType.MOVIES,
            findEntry: (userId, mediaId) => this.findEntry(userId, mediaId),
            toUserMedia: (entry, mediaId, ratingSystem) => this.toUserMedia(entry, mediaId, ratingSystem, false),
            getContribution: (entry) => ({
                playtime: 0,
                specific: entry.progress.watchCount,
                redo: movieRedoCount(entry.progress),
            }),
        });
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
        const [{ genres, tags }, langs] = await Promise.all([
            getLibraryGenresAndTags(MediaType.MOVIES, ownerId),
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
        const tags = includeTags ? await getLibraryEntryTags(entry.id) : undefined;

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
        const conditions = getCommonLibraryListConditions(MediaType.MOVIES, currentUserId, ownerId, args);
        if (args.langs?.length) conditions.push(inArray(movieDetails.originalLanguage, args.langs));
        if (args.directors?.length) conditions.push(inArray(movieDetails.directorName, args.directors));
        if (args.actors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: movieActor.catalogItemId })
                .from(movieActor)
                .where(inArray(movieActor.name, args.actors))));
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

        const { tags, commonIds } = await getLibraryListItemRelations(
            entryIds,
            catalogItemIds,
            currentUserId,
            ownerId,
        );

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
