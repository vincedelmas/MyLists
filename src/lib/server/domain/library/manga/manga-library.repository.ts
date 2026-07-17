import {and, eq, getTableColumns} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaDetails, mangaProgress} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {LibraryCommonRepository} from "@/lib/server/domain/library/library-common.repository";
import {isMangaStatus, MangaProgressState} from "@/lib/server/domain/library/manga/manga-progress";


export type MangaLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: typeof MediaType.MANGA;
    name: string;
    chapters: number | null;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    customCover: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    progress: MangaProgressState;
};


export class MangaLibraryRepository {
    readonly common = new LibraryCommonRepository();

    async findEntriesByCatalogItem(catalogItemId: number) {
        const owners = await getDbClient()
            .select({ userId: libraryEntry.userId })
            .from(libraryEntry)
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(eq(libraryEntry.catalogItemId, catalogItemId));
        const entries = await Promise.all(owners.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        return entries.filter((entry): entry is MangaLibraryEntry => !!entry);
    }

    async findEntry(userId: number, catalogItemId: number): Promise<MangaLibraryEntry | undefined> {
        const row = await getDbClient().select({
            ...getTableColumns(libraryEntry),
            kind: catalogItem.kind,
            name: catalogItem.name,
            chapters: mangaDetails.chapters,
            currentChapter: mangaProgress.currentChapter,
            rereadCount: mangaProgress.rereadCount,
            totalChaptersRead: mangaProgress.totalChaptersRead,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(libraryEntry.catalogItemId, catalogItemId)))
            .get();
        if (!row || row.kind !== MediaType.MANGA || !isMangaStatus(row.status)) return;
        return {
            id: row.id,
            userId: row.userId,
            catalogItemId: row.catalogItemId,
            kind: MediaType.MANGA,
            name: row.name,
            chapters: row.chapters,
            favorite: row.favorite,
            comment: row.comment,
            rating: row.rating,
            customCover: row.customCover,
            addedAt: row.addedAt,
            updatedAt: row.updatedAt,
            progress: {
                status: row.status,
                currentChapter: row.currentChapter,
                rereadCount: row.rereadCount,
                totalChaptersRead: row.totalChaptersRead,
            },
        };
    }

    async getMangaCatalogItem(catalogItemId: number) {
        const row = await getDbClient().select({
            id: catalogItem.id,
            kind: catalogItem.kind,
            name: catalogItem.name,
            chapters: mangaDetails.chapters,
        }).from(catalogItem)
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId)).get();
        return row?.kind === MediaType.MANGA ? { ...row, kind: MediaType.MANGA } : undefined;
    }

    async createEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        progress: MangaProgressState;
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
        await getDbClient().insert(mangaProgress).values({
            libraryEntryId: entryId,
            currentChapter: params.progress.currentChapter,
            rereadCount: params.progress.rereadCount,
            totalChaptersRead: params.progress.totalChaptersRead,
        });
        return entryId;
    }

    async saveProgress(entryId: number, progress: MangaProgressState) {
        await this.common.updateEntry(entryId, { status: progress.status });
        await getDbClient().update(mangaProgress).set({
            currentChapter: progress.currentChapter,
            rereadCount: progress.rereadCount,
            totalChaptersRead: progress.totalChaptersRead,
        }).where(eq(mangaProgress.libraryEntryId, entryId));
    }
}
