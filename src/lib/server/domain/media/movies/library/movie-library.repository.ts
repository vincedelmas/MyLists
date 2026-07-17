import {MediaType, Status} from "@/lib/utils/enums";
import {and, eq, getTableColumns} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MovieProgressState} from "@/lib/server/domain/media/movies/library/movie-progress";
import {LibraryCommonRepository} from "@/lib/server/domain/media/shared/library/library-common.repository";
import {catalogItem, libraryEntry, movieDetails, movieProgress} from "@/lib/server/database/schema";


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


export class MovieLibraryRepository {
    readonly common = new LibraryCommonRepository();

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
}
