import {and, eq, getTableColumns} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {bookDetails, bookProgress, catalogItem, libraryEntry} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {LibraryCommonRepository} from "@/lib/server/domain/library/library-common.repository";
import {BookProgressState, isBookStatus} from "@/lib/server/domain/library/books/book-progress";


export type BookLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: typeof MediaType.BOOKS;
    name: string;
    pages: number;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    customCover: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    progress: BookProgressState;
};


export class BookLibraryRepository {
    readonly common = new LibraryCommonRepository();

    async findEntriesByCatalogItem(catalogItemId: number) {
        const owners = await getDbClient()
            .select({ userId: libraryEntry.userId })
            .from(libraryEntry)
            .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .where(eq(libraryEntry.catalogItemId, catalogItemId));
        const entries = await Promise.all(owners.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        return entries.filter((entry): entry is BookLibraryEntry => !!entry);
    }

    async findEntry(userId: number, catalogItemId: number): Promise<BookLibraryEntry | undefined> {
        const row = await getDbClient().select({
            ...getTableColumns(libraryEntry),
            kind: catalogItem.kind,
            name: catalogItem.name,
            pages: bookDetails.pages,
            currentPage: bookProgress.currentPage,
            rereadCount: bookProgress.rereadCount,
            totalPagesRead: bookProgress.totalPagesRead,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(libraryEntry.catalogItemId, catalogItemId)))
            .get();
        if (!row || row.kind !== MediaType.BOOKS || !isBookStatus(row.status)) return;

        return {
            id: row.id,
            userId: row.userId,
            catalogItemId: row.catalogItemId,
            kind: MediaType.BOOKS,
            name: row.name,
            pages: row.pages,
            favorite: row.favorite,
            comment: row.comment,
            rating: row.rating,
            customCover: row.customCover,
            addedAt: row.addedAt,
            updatedAt: row.updatedAt,
            progress: {
                status: row.status,
                currentPage: row.currentPage,
                rereadCount: row.rereadCount,
                totalPagesRead: row.totalPagesRead,
            },
        };
    }

    async getBookCatalogItem(catalogItemId: number) {
        const row = await getDbClient().select({
            id: catalogItem.id,
            kind: catalogItem.kind,
            name: catalogItem.name,
            pages: bookDetails.pages,
        }).from(catalogItem)
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId)).get();
        return row?.kind === MediaType.BOOKS ? { ...row, kind: MediaType.BOOKS } : undefined;
    }

    async createEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        progress: BookProgressState;
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
        await getDbClient().insert(bookProgress).values({
            libraryEntryId: entryId,
            currentPage: params.progress.currentPage,
            rereadCount: params.progress.rereadCount,
            totalPagesRead: params.progress.totalPagesRead,
        });
        return entryId;
    }

    async saveProgress(entryId: number, progress: BookProgressState) {
        await this.common.updateEntry(entryId, { status: progress.status });
        await getDbClient().update(bookProgress).set({
            currentPage: progress.currentPage,
            rereadCount: progress.rereadCount,
            totalPagesRead: progress.totalPagesRead,
        }).where(eq(bookProgress.libraryEntryId, entryId));
    }
}
