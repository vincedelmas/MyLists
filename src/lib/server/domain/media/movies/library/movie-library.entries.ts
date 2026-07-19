import {MediaType, Status} from "@/lib/utils/enums";
import {and, eq, getTableColumns} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {CommonLibraryFields} from "@/lib/server/domain/media/shared/library/common-library.entries";
import {catalogItem, libraryEntry, movieDetails, movieProgress} from "@/lib/server/database/schema";
import {MovieProgressState, movieRedoCount} from "@/lib/server/domain/media/movies/library/movie-progress";


type CommonEntryWrites = {
    create: (params: typeof libraryEntry.$inferInsert) => Promise<number>;
    update: (entryId: number, fields: CommonLibraryFields) => Promise<void>;
};


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


export type CreateMovieLibraryEntry = {
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
};


export const findMovieLibraryEntry = async (userId: number, catalogItemId: number): Promise<MovieLibraryEntry | undefined> => {
    const row = getDbClient()
        .select({
            kind: catalogItem.kind,
            name: catalogItem.name,
            watchCount: movieProgress.watchCount,
            durationMinutes: movieDetails.durationMinutes,
            ...getTableColumns(libraryEntry),
        })
        .from(libraryEntry)
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
};


export const requireMovieLibraryEntry = async (userId: number, catalogItemId: number) => {
    const entry = await findMovieLibraryEntry(userId, catalogItemId);
    if (!entry) throw new FormattedError("Media not in your list");

    return entry;
};


export const findMovieCatalogItem = (catalogItemId: number) => {
    const row = getDbClient()
        .select({
            id: catalogItem.id,
            kind: catalogItem.kind,
            name: catalogItem.name,
            durationMinutes: movieDetails.durationMinutes,
        })
        .from(catalogItem)
        .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
        .where(eq(catalogItem.id, catalogItemId))
        .get();

    return row?.kind === MediaType.MOVIES ? { ...row, kind: MediaType.MOVIES } : undefined;
};


export const createMovieLibraryEntry = async (common: CommonEntryWrites, params: CreateMovieLibraryEntry) => {
    const entryId = await common.create({
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
};


export const saveMovieLibraryProgress = async (common: CommonEntryWrites, entryId: number, progress: MovieProgressState) => {
    await common.update(entryId, { status: progress.status });

    await getDbClient()
        .update(movieProgress)
        .set({ watchCount: progress.watchCount })
        .where(eq(movieProgress.libraryEntryId, entryId));
};


export const toMovieUserMediaFields = (entry: MovieLibraryEntry) => ({
    status: entry.progress.status,
    watchCount: entry.progress.watchCount,
    rewatchCount: movieRedoCount(entry.progress),
});
