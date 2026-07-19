import {getImageUrl} from "@/lib/utils/image-url";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdateUserMedia} from "@/lib/contracts/media/library";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {MovieListArgs, MovieListPage} from "@/lib/contracts/media/lists";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {and, asc, count, eq, gte, isNotNull, isNull, like, or, sql} from "drizzle-orm";
import {createCommonLibrary} from "@/lib/server/domain/media/shared/library/common-library";
import {MovieFinalListInsert} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {MovieStatsRepository} from "@/lib/server/domain/media/movies/library/movie-stats.repository";
import {LibraryStatsSnapshot} from "@/lib/server/domain/media/shared/library/common-library.lifecycle";
import {getLibraryGenresAndTags} from "@/lib/server/domain/media/shared/library/library-shared-queries";
import {catalogItem, libraryEntry, movieActor, movieDetails, movieProgress, user} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";
import {buildConditions, hydrateItems, MOVIE_LIST_SORTS, sortExpressions} from "@/lib/server/domain/media/movies/library/movie-library.lists";
import {changeMovieStatus, createInitialMovieProgress, importMovieProgress, movieRedoCount, replaceMovieRewatches} from "@/lib/server/domain/media/movies/library/movie-progress";
import {
    createMovieLibraryEntry,
    findMovieCatalogItem,
    findMovieLibraryEntry,
    MovieLibraryEntry,
    requireMovieLibraryEntry,
    saveMovieLibraryProgress,
    toMovieUserMediaFields,
} from "@/lib/server/domain/media/movies/library/movie-library.entries";


export type MovieLibrary = ReturnType<typeof createMovieLibrary>;
type MovieUpdatePayload = Extract<UpdateUserMedia, { mediaType: typeof MediaType.MOVIES }>["payload"];


export const createMovieLibrary = () => {
    const shared = createCommonLibrary({
        kind: MediaType.MOVIES,
        findEntry: findMovieLibraryEntry,
        toSpecificUserMedia: toMovieUserMediaFields,
        getCommunityContribution: (entry) => ({
            playtime: 0,
            specific: entry.progress.watchCount,
            redo: movieRedoCount(entry.progress),
        }),
    });

    const changeStatus = async (params: { userId: number; catalogItemId: number; status: Status; loggedAt?: string }) => {
        const current = await requireMovieLibraryEntry(params.userId, params.catalogItemId);
        const progress = changeMovieStatus(current.progress, params.status);

        await saveMovieLibraryProgress(shared.entries, current.id, progress);
        const updated = await requireMovieLibraryEntry(current.userId, current.catalogItemId);

        await shared.recordEntryTransition({
            entryId: current.id,
            newValue: params.status,
            loggedAt: params.loggedAt,
            after: statsSnapshot(updated),
            updateType: UpdateType.STATUS,
            before: statsSnapshot(current),
            oldValue: current.progress.status,
            activity: activityContribution(current, updated),
        });

        return updated;
    };

    const replaceRewatches = async (params: { userId: number; catalogItemId: number; rewatchCount: number; loggedAt?: string }) => {
        const current = await requireMovieLibraryEntry(params.userId, params.catalogItemId);
        const progress = replaceMovieRewatches(current.progress, params.rewatchCount);

        await saveMovieLibraryProgress(shared.entries, current.id, progress);
        const updated = await requireMovieLibraryEntry(current.userId, current.catalogItemId);

        await shared.recordEntryTransition({
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
    };

    const importEntry = async (params: {
        userId: number;
        status: Status;
        rewatchCount: number;
        catalogItemId: number;
        rating?: number | null;
        addedAt?: string | null;
        comment?: string | null;
        favorite?: boolean | null;
        updatedAt?: string | null;
        customCover?: string | null;
    }) => {
        const existing = await findMovieLibraryEntry(params.userId, params.catalogItemId);
        if (existing) return existing;

        if (!findMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");

        const progress = importMovieProgress(params.status, params.rewatchCount);
        await createMovieLibraryEntry(shared.entries, {
            ...params,
            progress,
            status: progress.status,
            rating: params.rating ?? null,
            comment: params.comment ?? null,
            favorite: params.favorite ?? false,
            customCover: params.customCover ?? null,
        });

        const imported = await requireMovieLibraryEntry(params.userId, params.catalogItemId);
        await shared.applyStatsTransition(undefined, statsSnapshot(imported));

        return imported;
    };

    const importRows = (rows: MovieFinalListInsert[]) => {
        return withTransaction(async () => {
            for (const row of rows) {
                await importEntry({
                    userId: row.userId,
                    status: row.status,
                    rating: row.rating,
                    comment: row.comment,
                    addedAt: row.addedAt,
                    favorite: row.favorite,
                    updatedAt: row.lastUpdated,
                    catalogItemId: row.mediaId,
                    rewatchCount: row.redo ?? 0,
                    customCover: row.customCover,
                });
            }
        });
    };

    const add = async (params: { userId: number; catalogItemId: number; status?: Status; silent?: boolean }) => {
        if (!findMovieCatalogItem(params.catalogItemId)) throw new FormattedError("Media not found");
        if (await findMovieLibraryEntry(params.userId, params.catalogItemId)) {
            throw new FormattedError("Media already in your list");
        }

        const progress = createInitialMovieProgress(params.status ?? Status.PLAN_TO_WATCH);
        await createMovieLibraryEntry(shared.entries, { ...params, status: progress.status, progress });

        const created = await requireMovieLibraryEntry(params.userId, params.catalogItemId);
        await shared.recordCreatedEntry({
            entryId: created.id,
            snapshot: statsSnapshot(created),
            activity: activityContribution(undefined, created),
        });

        return created;
    };

    const update = (params: { userId: number; mediaId: number; payload: MovieUpdatePayload }) => {
        const common = { userId: params.userId, catalogItemId: params.mediaId };

        switch (params.payload.type) {
            case UpdateType.STATUS:
                return changeStatus({ ...common, status: params.payload.status, loggedAt: params.payload.loggedAt });
            case UpdateType.REDO:
                return replaceRewatches({ ...common, rewatchCount: params.payload.rewatchCount, loggedAt: params.payload.loggedAt });
            case UpdateType.RATING:
                return shared.updateRating({ ...common, rating: params.payload.rating ?? null });
            case UpdateType.COMMENT:
                return shared.updateComment({ ...common, comment: params.payload.comment ?? null });
            case UpdateType.FAVORITE:
                return shared.updateFavorite({ ...common, favorite: params.payload.favorite ?? false });
            default:
                throw new Error("Unsupported movie update type.");
        }
    };

    const remove = async (params: { userId: number; catalogItemId: number }) => {
        const current = await requireMovieLibraryEntry(params.userId, params.catalogItemId);
        return shared.removeEntry(current.id, statsSnapshot(current));
    };

    const reconcileCatalogMetadata = async (previousEntries: MovieLibraryEntry[]) => {
        for (const previous of previousEntries) {
            const current = await requireMovieLibraryEntry(previous.userId, previous.catalogItemId);
            await shared.applyStatsTransition(statsSnapshot(previous), statsSnapshot(current));
        }
    };

    const upcoming = (ownerId: number): Promise<UpComingMedia[]> => {
        return getUpcomingMedia({
            ownerId,
            reason: "owner",
            actorId: ownerId,
            mediaTypeEnabled: true,
        });
    };

    const getMediaList = async (currentUserId: number | undefined, access: MediaListAccessScope, args: MovieListArgs): Promise<MovieListPage> => {
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

        const totalItems = totalRow?.value ?? 0;
        const items = await hydrateItems(rows, currentUserId, ownerId);

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
    };

    const getListFilters = async (access: MediaListAccessScope) => {
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
    };

    const getUpcomingMedia = async (access: MediaListAccessScope) => {
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
    };

    const getSearchListFilters = (access: MediaListAccessScope, query: string, job: JobType) => {
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
        return Promise.resolve([]);
    };

    const exportMovieListCsv = async (userId: number) => {
        const metadata = libraryCsvMetadata(MediaType.MOVIES);

        return getDbClient()
            .select({
                ...libraryCsvBaseSelection,
                total: movieProgress.watchCount,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.MOVIES)))
            .then((rows) => rows.map((row) => ({
                ...row,
                ...metadata,
                redo: Math.max(0, row.total - 1),
            })));
    };

    return {
        add,
        update,
        remove,
        upcoming,
        importRows,
        importEntry,
        changeStatus,
        getMediaList,
        getListFilters,
        getUpcomingMedia,
        replaceRewatches,
        getSearchListFilters,
        reconcileCatalogMetadata,
        export: exportMovieListCsv,
        stats: MovieStatsRepository,
        ...shared,
    };
};


const statsSnapshot = (entry: MovieLibraryEntry): LibraryStatsSnapshot => ({
    userId: entry.userId,
    status: entry.progress.status,
    rating: entry.rating ?? 0,
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
