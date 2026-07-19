import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {MovieListArgs, MovieListPage} from "@/lib/contracts/media/lists";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, or, sql, SQL} from "drizzle-orm";
import {JobType, MediaType, RatingSystemType, Status, UpdateType} from "@/lib/utils/enums";
import {MovieFinalListInsert} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {MovieStatsRepository} from "@/lib/server/domain/media/movies/library/movie-stats.repository";
import {exportMovieLibraryCsv} from "@/lib/server/domain/media/movies/library/movie-library-csv-export";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {MOVIE_LIST_SORTS, MovieLibraryEntry, MovieLibraryRepository} from "@/lib/server/domain/media/movies/library/movie-library.repository";
import {CommonLibraryService, createCommonLibrary, LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.service";
import {catalogItem, libraryEntry, libraryEntryTag, libraryTag, movieActor, movieDetails, movieProgress, user} from "@/lib/server/database/schema";
import {
    changeMovieStatus,
    createInitialMovieProgress,
    importMovieProgress,
    MovieProgressState,
    movieRedoCount,
    replaceMovieRewatches
} from "@/lib/server/domain/media/movies/library/movie-progress";
import {getLibraryGenresAndTags} from "@/lib/server/domain/media/shared/library/library-shared-queries";


type MovieUpdatePayload = Extract<UpdateUserMedia, { mediaType: typeof MediaType.MOVIES }>["payload"];


export class MovieLibraryService {
    readonly stats = MovieStatsRepository;
    readonly export = { csv: exportMovieLibraryCsv };

    constructor(
        private readonly repository = new MovieLibraryRepository(),
        readonly common = new CommonLibraryService(new CommonLibraryRepository(MediaType.MOVIES)),
    ) {
    }

    findUserMedia(userId: number | undefined, catalogItemId: number) {
        return this.repository.findUserMedia(userId, catalogItemId);
    }

    findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        return this.repository.findFollowedUsersMedia(viewerId, catalogItemId);
    }

    getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType) {
        return this.repository.getCommunityActivity(viewerId, catalogItemId, search);
    }

    findEntriesByCatalogItem(catalogItemId: number) {
        return this.repository.findEntriesByCatalogItem(catalogItemId);
    }

    getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MovieListArgs) {
        return this.repository.getMediaList(currentUserId, access, args);
    }

    getListFilters(access: MediaListAccessScope) {
        return this.repository.getListFilters(access);
    }

    getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        return this.repository.getSearchListFilters(access, query, job);
    }

    async upcoming(ownerId: number): Promise<UpComingMedia[]> {
        return this.repository.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
    }

    async update(params: { userId: number; mediaId: number; payload: MovieUpdatePayload }) {
        const common = { userId: params.userId, catalogItemId: params.mediaId };

        switch (params.payload.type) {
            case UpdateType.STATUS:
                if (!params.payload.status) return;
                return this.changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.REDO:
                return this.replaceRewatches({ ...common, rewatchCount: params.payload.rewatchCount, loggedAt: params.payload.loggedAt });
            case UpdateType.RATING:
                return this.common.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return this.common.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return this.common.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported movie update type.");
        }
    }

    async importRows(rows: MovieFinalListInsert[]) {
        return withTransaction(async () => {
            for (const row of rows) {
                const existing = await this.repository.findEntry(row.userId, row.mediaId);
                if (existing) return existing;

                if (!await this.repository.getMovieCatalogItem(row.mediaId)) {
                    throw new FormattedError("Media not found");
                }

                const progress = importMovieProgress(row.status, row.redo ?? 0);

                await this.repository.createEntry({
                    ...row,
                    progress,
                    status: progress.status,
                    rating: row.rating ?? null,
                    catalogItemId: row.mediaId,
                    comment: row.comment ?? null,
                    favorite: row.favorite ?? false,
                    customCover: row.customCover ?? null,
                });

                const imported = await this.requireEntry(row.userId, row.mediaId);
                await this.common.applyStatsTransition(undefined, statsSnapshot(imported));
            }
        });
    }

    async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
        if (!await this.repository.getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await this.repository.findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");
        const progress = createInitialMovieProgress(params.status ?? Status.PLAN_TO_WATCH);
        await this.repository.createEntry({ ...params, status: progress.status, progress });
        const created = await this.requireEntry(params.userId, params.catalogItemId);
        await this.common.recordCreatedEntry({
            entryId: created.id,
            snapshot: statsSnapshot(created),
            activity: activityContribution(undefined, created),
        });
        return created;
    }

    async changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = changeMovieStatus(current.progress, params.status);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.STATUS,
            oldValue: current.progress.status,
            newValue: params.status,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async replaceRewatches(params: { userId: number; catalogItemId: number; rewatchCount: number; loggedAt?: string }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        const progress = replaceMovieRewatches(current.progress, params.rewatchCount);
        await this.repository.saveProgress(current.id, progress);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.common.recordEntryTransition({
            entryId: current.id,
            before: statsSnapshot(current),
            after: statsSnapshot(updated),
            activity: activityContribution(current, updated),
            updateType: UpdateType.REDO,
            oldValue: movieRedoCount(current.progress),
            newValue: params.rewatchCount,
            loggedAt: params.loggedAt,
        });
        return updated;
    }

    async remove(params: { userId: number; catalogItemId: number }) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.common.removeEntry(current.id, statsSnapshot(current));
    }

    async reconcileCatalogMetadata(previousEntries: MovieLibraryEntry[]) {
        for (const previous of previousEntries) {
            const current = await this.requireEntry(previous.userId, previous.catalogItemId);
            await this.common.applyStatsTransition(statsSnapshot(previous), statsSnapshot(current));
        }
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }
}


const statsSnapshot = (entry: MovieLibraryEntry): LibraryStatsSnapshot => ({
    userId: entry.userId,
    rating: entry.rating ?? 0,
    status: entry.progress.status,
    favorited: Number(entry.favorite),
    commented: Number(!!entry.comment),
    specific: entry.progress.watchCount,
    redo: movieRedoCount(entry.progress),
    rated: Number(entry.rating !== null),
    time: entry.progress.watchCount * entry.durationMinutes,
});


const activityContribution = (before: MovieLibraryEntry | undefined, after: MovieLibraryEntry) => ({
    unitsGained: after.progress.watchCount - (before?.progress.watchCount ?? 0),
    completed: before?.progress.status !== Status.COMPLETED && after.progress.status === Status.COMPLETED,
    redo: movieRedoCount(after.progress) > (before ? movieRedoCount(before.progress) : 0),
});


// ---------------------------------------------------------------
// ---------------------------------------------------------------


type MinHydration = {
    id: number;
    status: Status;
    watchCount: number;
    imageCover: string;
    catalogItemId: number;
    customCover: string | null;
}


export const createMoviesLibrary = (kind = MediaType.MOVIES) => {
    const commonLibrary = createCommonLibrary({
        kind,
        findEntry: findEntry,
        toUserMedia: toUserMedia,
        getContribution: (entry) => ({
            playtime: 0,
            specific: entry.progress.watchCount,
            redo: movieRedoCount(entry.progress),
        }),
    });

    async function requireEntry(userId: number, catalogItemId: number) {
        const entry = await findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }

    async function getLibraryEntryTags(libraryEntryId: number) {
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryEntryTag)
            .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
            .where(eq(libraryEntryTag.libraryEntryId, libraryEntryId))
            .orderBy(asc(libraryTag.name));
    }

    async function findEntry(userId: number, catalogItemId: number) {
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

        if (!row || row.kind !== kind) return;
        if (row.status !== Status.COMPLETED && row.status !== Status.PLAN_TO_WATCH) return;

        return {
            kind,
            id: row.id,
            name: row.name,
            userId: row.userId,
            rating: row.rating,
            comment: row.comment,
            addedAt: row.addedAt,
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

    async function toUserMedia(entry: MovieLibraryEntry, catalogItemId: number, ratingSystem: RatingSystemType, includeTags: boolean) {
        // TODO: Should be extracted ? so that it can live in createCommonLibrary ?
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

    async function hydrateItems<TRow extends MinHydration>(rows: TRow[], currentUserId: number | undefined, ownerId: number) {
        if (rows.length === 0) return [];

        const entryIds = rows.map(({ id }) => id);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
        const { tags, commonIds } = await commonLibrary.getLibraryListItemRelations(entryIds, catalogItemIds, currentUserId, ownerId);

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
                kind,
                watchCount,
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

    async function saveProgress(entryId: number, progress: MovieProgressState) {
        await commonLibrary.updateEntry(entryId, { status: progress.status });

        await getDbClient()
            .update(movieProgress)
            .set({ watchCount: progress.watchCount })
            .where(eq(movieProgress.libraryEntryId, entryId));
    }

    async function changeStatus(params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) {
        const current = await requireEntry(params.userId, params.catalogItemId);

        const progress = changeMovieStatus(current.progress, params.status);
        await saveProgress(current.id, progress);

        const updated = await requireEntry(current.userId, current.catalogItemId);

        await commonLibrary.recordEntryTransition({
            entryId: current.id,
            newValue: params.status,
            loggedAt: params.loggedAt,
            updateType: UpdateType.STATUS,
            after: statsSnapshot(updated),
            before: statsSnapshot(current),
            oldValue: current.progress.status,
            activity: activityContribution(current, updated),
        });

        return updated;
    }

    async function replaceRewatches(params: { userId: number; catalogItemId: number; rewatchCount: number; loggedAt?: string }) {
        const current = await requireEntry(params.userId, params.catalogItemId);
        const progress = replaceMovieRewatches(current.progress, params.rewatchCount);

        await saveProgress(current.id, progress);
        const updated = await requireEntry(current.userId, current.catalogItemId);

        await commonLibrary.recordEntryTransition({
            entryId: current.id,
            loggedAt: params.loggedAt,
            updateType: UpdateType.REDO,
            newValue: params.rewatchCount,
            after: statsSnapshot(updated),
            before: statsSnapshot(current),
            oldValue: movieRedoCount(current.progress),
            activity: activityContribution(current, updated),
        });

        return updated;
    }

    async function getMovieCatalogItem(catalogItemId: number) {
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

    async function createEntry(params: {
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
        const entryId = await commonLibrary.createEntry({
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

    function buildConditions(currentUserId: number | undefined, ownerId: number, args: MovieListArgs) {
        const conditions = commonLibrary.getCommonLibraryListConditions(currentUserId, ownerId, args);

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

    function sortExpressions(sorting: typeof MOVIE_LIST_SORTS[number]): SQL[] {
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

    return {
        ...commonLibrary,

        async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MovieListArgs): Promise<MovieListPage> {
            const ownerId = access.ownerId;
            const { page, perPage, offset, limit } = resolvePagination(args);

            const sorting = resolveSorting(args.sorting, MOVIE_LIST_SORTS, "Title A-Z");
            const conditions = buildConditions(currentUserId, ownerId, args);

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
                    .orderBy(...sortExpressions(sorting))
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

            const items = await hydrateItems(rows, currentUserId, ownerId);
            const totalItems = totalRow?.value ?? 0;

            return {
                kind,
                items,
                pagination: {
                    page,
                    perPage,
                    sorting,
                    totalItems,
                    availableSorting: [...MOVIE_LIST_SORTS],
                    totalPages: Math.ceil(totalItems / perPage),
                },
            };
        },

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
        },

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
                    .selectDistinct({ name: sql<string>`${movieDetails.directorName}` })
                    .from(movieDetails)
                    .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, movieDetails.catalogItemId))
                    .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                    .where(and(
                        eq(libraryEntry.userId, ownerId),
                        eq(catalogItem.kind, MediaType.MOVIES),
                        like(movieDetails.directorName, `%${query}%`),
                    ));
            }

            return [];
        },

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
        },

        async update(params: { userId: number; mediaId: number; payload: MovieUpdatePayload }) {
            const common = { userId: params.userId, catalogItemId: params.mediaId };

            switch (params.payload.type) {
                case UpdateType.STATUS:
                    if (!params.payload.status) return;
                    return changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
                case UpdateType.REDO:
                    return replaceRewatches({ ...common, rewatchCount: params.payload.rewatchCount, loggedAt: params.payload.loggedAt });
                case UpdateType.RATING:
                    return commonLibrary.updateRating({ ...common, rating: params.payload.rating ?? null });
                case UpdateType.COMMENT:
                    return commonLibrary.updateComment({ ...common, comment: params.payload.comment ?? null });
                case UpdateType.FAVORITE:
                    return commonLibrary.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
                default:
                    throw new Error("Unsupported movie update type.");
            }
        },

        async importRows(rows: MovieFinalListInsert[]) {
            return withTransaction(async () => {
                for (const row of rows) {
                    const existing = await findEntry(row.userId, row.mediaId);
                    if (existing) return existing;

                    if (!await getMovieCatalogItem(row.mediaId)) {
                        throw new FormattedError("Media not found");
                    }

                    const progress = importMovieProgress(row.status, row.redo ?? 0);

                    await createEntry({
                        ...row,
                        progress,
                        status: progress.status,
                        rating: row.rating ?? null,
                        catalogItemId: row.mediaId,
                        comment: row.comment ?? null,
                        favorite: row.favorite ?? false,
                        customCover: row.customCover ?? null,
                    });

                    const imported = await requireEntry(row.userId, row.mediaId);
                    await commonLibrary.applyStatsTransition(undefined, statsSnapshot(imported));
                }
            });
        },

        async add(params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) {
            if (!await getMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
            if (await findEntry(params.userId, params.catalogItemId)) throw new FormattedError("Media already in your list");

            const progress = createInitialMovieProgress(params.status ?? Status.PLAN_TO_WATCH);
            await createEntry({ ...params, status: progress.status, progress });
            const created = await requireEntry(params.userId, params.catalogItemId);

            await commonLibrary.recordCreatedEntry({
                entryId: created.id,
                snapshot: statsSnapshot(created),
                activity: activityContribution(undefined, created),
            });

            return created;
        },

        async remove(params: { userId: number; catalogItemId: number }) {
            const current = await requireEntry(params.userId, params.catalogItemId);
            return commonLibrary.removeEntry(current.id, statsSnapshot(current));
        },

        async reconcileCatalogMetadata(previousEntries: MovieLibraryEntry[]) {
            for (const previous of previousEntries) {
                const current = await requireEntry(previous.userId, previous.catalogItemId);
                await commonLibrary.applyStatsTransition(statsSnapshot(previous), statsSnapshot(current));
            }
        },

        changeStatus,

        replaceRewatches,
    }
}
