import {and, eq, getTableColumns} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, movieDetails, movieProgress} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {LibraryCommonRepository} from "@/lib/server/domain/library/library-common.repository";
import {MovieProgressState} from "@/lib/server/domain/library/movies/movie-progress";


export type MovieLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: typeof MediaType.MOVIES;
    name: string;
    durationMinutes: number;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    customCover: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    progress: MovieProgressState;
};


export class MovieLibraryRepository {
    readonly common = new LibraryCommonRepository();

    async findEntriesByCatalogItem(catalogItemId: number) {
        const owners = await getDbClient().select({ userId: libraryEntry.userId }).from(libraryEntry)
            .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .where(eq(libraryEntry.catalogItemId, catalogItemId));
        const entries = await Promise.all(owners.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        return entries.filter((entry): entry is MovieLibraryEntry => !!entry);
    }

    async findEntry(userId: number, catalogItemId: number): Promise<MovieLibraryEntry | undefined> {
        const row = await getDbClient().select({
            ...getTableColumns(libraryEntry),
            kind: catalogItem.kind,
            name: catalogItem.name,
            durationMinutes: movieDetails.durationMinutes,
            watchCount: movieProgress.watchCount,
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
            userId: row.userId,
            catalogItemId: row.catalogItemId,
            kind: MediaType.MOVIES,
            name: row.name,
            durationMinutes: row.durationMinutes,
            favorite: row.favorite,
            comment: row.comment,
            rating: row.rating,
            customCover: row.customCover,
            addedAt: row.addedAt,
            updatedAt: row.updatedAt,
            progress: { status: row.status, watchCount: row.watchCount },
        };
    }

    async getMovieCatalogItem(catalogItemId: number) {
        const row = await getDbClient().select({
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
        catalogItemId: number;
        status: Status;
        progress: MovieProgressState;
        favorite?: boolean | null;
        comment?: string | null;
        rating?: number | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const entryId = await this.common.createEntry({
            userId: params.userId,
            catalogItemId: params.catalogItemId,
            status: params.status,
            favorite: params.favorite ?? false,
            comment: params.comment,
            rating: params.rating,
            customCover: params.customCover,
            addedAt: params.addedAt,
            updatedAt: params.updatedAt,
        });
        await getDbClient().insert(movieProgress).values({
            libraryEntryId: entryId,
            watchCount: params.progress.watchCount,
        });
        return entryId;
    }

    async saveProgress(entryId: number, progress: MovieProgressState) {
        await this.common.updateEntry(entryId, { status: progress.status });
        await getDbClient().update(movieProgress).set({ watchCount: progress.watchCount })
            .where(eq(movieProgress.libraryEntryId, entryId));
    }
}
