import {and, asc, count, desc, eq, inArray, isNotNull, like, notInArray, SQL, sql,} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {SimpleSearch} from "@/lib/schemas";
import {BookListArgs, BookListPage} from "@/lib/contracts/media/lists";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {isBookStatus} from "@/lib/server/domain/media/books/library/book-progress";
import {
    bookAuthor,
    bookDetails,
    bookProgress,
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";


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


/** Concrete book list query; progress totals remain entry-owned historical data. */
export class BookListReadRepository {
    async getListHeader(userId: number) {
        const channel = await getDbClient().select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel).where(and(
                eq(profileMediaChannel.userId, userId),
                eq(profileMediaChannel.kind, MediaType.BOOKS),
            )).get();
        if (!channel?.enabled) return;
        const stats = await getDbClient().select({ timeSpent: libraryStats.timeSpentMinutes })
            .from(libraryStats).where(and(
                eq(libraryStats.userId, userId),
                eq(libraryStats.kind, MediaType.BOOKS),
            )).get();
        return { timeSpent: stats?.timeSpent ?? 0 };
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
        const [genres, tags, langs] = await Promise.all([
            getDbClient().selectDistinct({ name: catalogGenre.name }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.BOOKS)))
                .orderBy(asc(catalogGenre.name)),
            getDbClient().select({ name: libraryTag.name }).from(libraryTag)
                .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, MediaType.BOOKS)))
                .orderBy(asc(libraryTag.name)),
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

    async getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        const ownerId = access.ownerId;
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const tagRows = await getDbClient().select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag).where(and(
                eq(libraryTag.userId, ownerId),
                eq(libraryTag.kind, MediaType.BOOKS),
                search.search ? like(libraryTag.name, `%${search.search}%`) : undefined,
            ));
        const linkedByTag = await Promise.all(tagRows.map(async (tag) => {
            const medias = await getDbClient().select({
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                mediaCover: catalogItem.imageCover,
                activity: sql<string>`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`,
            }).from(libraryEntryTag)
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
                    mediaCover: getImageUrl("books-covers", mediaCover),
                })),
            };
        }));
        linkedByTag.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity) || a.tagName.localeCompare(b.tagName));
        const items = linkedByTag.slice(pagination.offset, pagination.offset + pagination.limit)
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

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: BookListArgs) {
        const conditions: SQL[] = [eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.BOOKS)];
        if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
        if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
        if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
        if (args.status?.length) conditions.push(inArray(libraryEntry.status, args.status));
        if (args.langs?.length) conditions.push(inArray(bookDetails.language, args.langs));
        if (args.tags?.length) {
            conditions.push(inArray(libraryEntry.id, getDbClient().select({ libraryEntryId: libraryEntryTag.libraryEntryId })
                .from(libraryEntryTag).innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryTag.name, args.tags))));
        }
        if (args.genres?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: catalogItemGenre.catalogItemId })
                .from(catalogItemGenre).innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(inArray(catalogGenre.name, args.genres))));
        }
        if (args.authors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: bookAuthor.catalogItemId })
                .from(bookAuthor).where(inArray(bookAuthor.name, args.authors))));
        }
        if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
            const currentEntry = alias(libraryEntry, "current_book_library_entry");
            conditions.push(notInArray(catalogItem.id, getDbClient().select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry).where(eq(currentEntry.userId, currentUserId))));
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
        const [tags, commonEntries] = await Promise.all([
            getDbClient().select({ libraryEntryId: libraryEntryTag.libraryEntryId, id: libraryTag.id, name: libraryTag.name })
                .from(libraryEntryTag).innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryEntryTag.libraryEntryId, entryIds)).orderBy(asc(libraryTag.name)),
            currentUserId && currentUserId !== ownerId
                ? getDbClient().select({ catalogItemId: libraryEntry.catalogItemId }).from(libraryEntry)
                    .where(and(eq(libraryEntry.userId, currentUserId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
                : [],
        ]);
        const commonIds = new Set(commonEntries.map(({ catalogItemId }) => catalogItemId));
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
