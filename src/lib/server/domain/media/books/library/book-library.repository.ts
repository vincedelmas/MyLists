import {and, asc, count, desc, eq, getTableColumns, inArray, isNotNull, like, sql, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    bookAuthor,
    bookDetails,
    bookProgress,
    catalogItem,
    libraryEntry,
    user
} from "@/lib/server/database/schema";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {BookProgressState, isBookStatus} from "@/lib/server/domain/media/books/library/book-progress";
import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {BookCommunityActivityPage} from "@/lib/contracts/media/community";
import {BookListArgs, BookListPage} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
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

export const BOOK_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Rating +",
    "Rating -",
    "Published Date +",
    "Published Date -",
    "Recently Added",
    "Recently Modified",
    "Re-Read",
    "Pages +",
    "Pages -",
] as const;

export class BookLibraryRepository {
    constructor(private readonly common = new CommonLibraryRepository(MediaType.BOOKS)) {
    }

    async findEntriesByCatalogItem(catalogItemId: number) {
        return findLibraryEntriesByCatalogItem(
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
        );
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
            MediaType.BOOKS,
            viewerId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<BookCommunityActivityPage> {
        return getLibraryCommunityActivity({
            kind: MediaType.BOOKS,
            viewerId,
            catalogItemId,
            search,
            findEntry: (userId, mediaId) => this.findEntry(userId, mediaId),
            toUserMedia: (entry, mediaId, ratingSystem) => this.toUserMedia(entry, mediaId, ratingSystem, false),
            getContribution: (entry) => ({
                redo: entry.progress.rereadCount,
                specific: entry.progress.totalPagesRead,
                playtime: 0,
            }),
        });
    }

    private async toUserMedia(entry: BookLibraryEntry, catalogItemId: number, ratingSystem: typeof user.$inferSelect.ratingSystem, includeTags: boolean) {
        const tags = includeTags ? await getLibraryEntryTags(entry.id) : undefined;

        const userMedia = {
            id: entry.id,
            userId: entry.userId,
            rating: entry.rating,
            mediaId: catalogItemId,
            comment: entry.comment,
            addedAt: entry.addedAt,
            favorite: entry.favorite,
            lastUpdated: entry.updatedAt,
            status: entry.progress.status,
            currentPage: entry.progress.currentPage,
            rereadCount: entry.progress.rereadCount,
            totalPagesRead: entry.progress.totalPagesRead,
            customCover: entry.customCover ? getImageUrl("books-covers", entry.customCover) : null,
        };

        return { ...userMedia, ratingSystem, tags: tags ?? [] };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: BookListArgs): Promise<BookListPage> {
        const ownerId = access.ownerId;
        const { page, perPage, offset, limit } = resolvePagination(args);
        const sorting = resolveSorting(args.sorting, BOOK_LIST_SORTS, "Title A-Z");
        const conditions = this.buildConditions(currentUserId, ownerId, args);
        const [rows, totalRow] = await Promise.all([
            getDbClient().select({
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
                currentPage: bookProgress.currentPage,
                rereadCount: bookProgress.rereadCount,
                totalPagesRead: bookProgress.totalPagesRead,
                pages: bookDetails.pages,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                ratingSystem: user.ratingSystem,
            }).from(libraryEntry)
                .innerJoin(user, eq(user.id, libraryEntry.userId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
                .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions))
                .orderBy(...this.sortExpressions(sorting))
                .limit(limit).offset(offset),
            getDbClient().select({ value: count() }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
                .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions)).get(),
        ]);
        const items = await this.hydrateItems(rows, currentUserId, ownerId);
        const totalItems = totalRow?.value ?? 0;
        return {
            kind: MediaType.BOOKS,
            items,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil(totalItems / perPage),
                totalItems,
                sorting,
                availableSorting: [...BOOK_LIST_SORTS],
            },
        };
    }

    async getListFilters(access: MediaListAccessScope) {
        const ownerId = access.ownerId;
        const [{ genres, tags }, langs] = await Promise.all([
            getLibraryGenresAndTags(MediaType.BOOKS, ownerId),
            getDbClient().selectDistinct({ name: bookDetails.language }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.BOOKS),
                    isNotNull(bookDetails.language),
                )),
        ]);
        return { kind: MediaType.BOOKS, genres, tags, langs: langs as { name: string }[] };
    }

    async getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        if (job !== JobType.CREATOR) return [];
        return getDbClient().selectDistinct({ name: bookAuthor.name }).from(bookAuthor)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, bookAuthor.catalogItemId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, access.ownerId),
                eq(catalogItem.kind, MediaType.BOOKS),
                like(bookAuthor.name, `%${query}%`),
            ));
    }

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: BookListArgs) {
        const conditions = getCommonLibraryListConditions(MediaType.BOOKS, currentUserId, ownerId, args);
        if (args.langs?.length) conditions.push(inArray(bookDetails.language, args.langs));
        if (args.authors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: bookAuthor.catalogItemId })
                .from(bookAuthor).where(inArray(bookAuthor.name, args.authors))));
        }
        return conditions;
    }

    private sortExpressions(sorting: typeof BOOK_LIST_SORTS[number]): SQL[] {
        const name = asc(catalogItem.name);
        const itemId = asc(catalogItem.id);
        const sorts: Record<typeof sorting, SQL[]> = {
            "Title A-Z": [name, itemId],
            "Title Z-A": [desc(catalogItem.name), itemId],
            "Rating +": [desc(libraryEntry.rating), name, itemId],
            "Rating -": [asc(libraryEntry.rating), name, itemId],
            "Published Date +": [desc(catalogItem.releaseDate), name, itemId],
            "Published Date -": [sql`${catalogItem.releaseDate} ASC NULLS LAST`, name, itemId],
            "Recently Added": [desc(libraryEntry.addedAt), name, itemId],
            "Recently Modified": [desc(libraryEntry.updatedAt), name, itemId],
            "Re-Read": [desc(bookProgress.rereadCount), name, itemId],
            "Pages +": [desc(bookDetails.pages), name, itemId],
            "Pages -": [asc(bookDetails.pages), name, itemId],
        };
        return sorts[sorting];
    }

    private async hydrateItems<TRow extends {
        catalogItemId: number;
        id: number;
        status: Status;
        imageCover: string;
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
        return rows.map(({ catalogItemId, imageCover, customCover, ...row }) => {
            if (!isBookStatus(row.status)) throw new Error(`Invalid book library status: ${row.status}`);
            return {
                ...row,
                kind: MediaType.BOOKS,
                customCover: customCover ? getImageUrl("books-covers", customCover) : null,
                imageCover: getImageUrl("books-covers", customCover ?? imageCover),
                tags: tags.filter((tag) => tag.libraryEntryId === row.id)
                    .map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }

}
