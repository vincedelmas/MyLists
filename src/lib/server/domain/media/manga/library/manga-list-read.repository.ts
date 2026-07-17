import {and, asc, count, desc, eq, inArray, isNotNull, like, notInArray, SQL, sql} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {SimpleSearch} from "@/lib/schemas";
import {MangaListArgs, MangaListPage} from "@/lib/contracts/media/lists";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {isMangaStatus} from "@/lib/server/domain/media/manga/library/manga-progress";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    mangaAuthor,
    mangaDetails,
    mangaProgress,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";


export const MANGA_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Rating +",
    "Rating -",
    "Published Date +",
    "Published Date -",
    "Recently Added",
    "Recently Modified",
    "Re-Read",
    "Chapters +",
    "Chapters -",
] as const;


/** Concrete manga list query; progress totals remain entry-owned historical data. */
export class MangaListReadRepository {
    async getListHeader(userId: number) {
        const channel = await getDbClient().select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel).where(and(
                eq(profileMediaChannel.userId, userId),
                eq(profileMediaChannel.kind, MediaType.MANGA),
            )).get();
        if (!channel?.enabled) return;
        const stats = await getDbClient().select({ timeSpent: libraryStats.timeSpentMinutes })
            .from(libraryStats).where(and(
                eq(libraryStats.userId, userId),
                eq(libraryStats.kind, MediaType.MANGA),
            )).get();
        return { timeSpent: stats?.timeSpent ?? 0 };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MangaListArgs): Promise<MangaListPage> {
        const ownerId = access.ownerId;
        const { page, perPage, offset, limit } = resolvePagination(args);
        const sorting = resolveSorting(args.sorting, MANGA_LIST_SORTS, "Title A-Z");
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
                currentChapter: mangaProgress.currentChapter,
                rereadCount: mangaProgress.rereadCount,
                totalChaptersRead: mangaProgress.totalChaptersRead,
                chapters: mangaDetails.chapters,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                ratingSystem: user.ratingSystem,
            }).from(libraryEntry)
                .innerJoin(user, eq(user.id, libraryEntry.userId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
                .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions))
                .orderBy(...this.sortExpressions(sorting))
                .limit(limit).offset(offset),
            getDbClient().select({ value: count() }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
                .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions)).get(),
        ]);
        const items = await this.hydrateItems(rows, currentUserId, ownerId);
        const totalItems = totalRow?.value ?? 0;
        return {
            kind: MediaType.MANGA,
            items,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil(totalItems / perPage),
                totalItems,
                sorting,
                availableSorting: [...MANGA_LIST_SORTS],
            },
        };
    }

    async getListFilters(access: MediaListAccessScope) {
        const ownerId = access.ownerId;
        const [genres, tags] = await Promise.all([
            getDbClient().selectDistinct({ name: catalogGenre.name }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.MANGA)))
                .orderBy(asc(catalogGenre.name)),
            getDbClient().select({ name: libraryTag.name }).from(libraryTag)
                .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, MediaType.MANGA)))
                .orderBy(asc(libraryTag.name)),
        ]);
        return { kind: MediaType.MANGA, genres, tags };
    }

    async getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        if (job === JobType.CREATOR) {
            return getDbClient().selectDistinct({ name: mangaAuthor.name }).from(mangaAuthor)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, mangaAuthor.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, access.ownerId),
                    eq(catalogItem.kind, MediaType.MANGA),
                    like(mangaAuthor.name, `%${query}%`),
                ));
        }
        if (job === JobType.PUBLISHER) {
            return getDbClient().selectDistinct({ name: mangaDetails.publisher }).from(mangaDetails)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, mangaDetails.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, access.ownerId),
                    eq(catalogItem.kind, MediaType.MANGA),
                    isNotNull(mangaDetails.publisher),
                    like(mangaDetails.publisher, `%${query}%`),
                )) as Promise<{ name: string }[]>;
        }
        return [];
    }

    async getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        const ownerId = access.ownerId;
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const tagRows = await getDbClient().select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag).where(and(
                eq(libraryTag.userId, ownerId),
                eq(libraryTag.kind, MediaType.MANGA),
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
                    mediaCover: getImageUrl("manga-covers", mediaCover),
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

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: MangaListArgs) {
        const conditions: SQL[] = [eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.MANGA)];
        if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
        if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
        if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
        if (args.status?.length) conditions.push(inArray(libraryEntry.status, args.status));
        if (args.publishers?.length) conditions.push(inArray(mangaDetails.publisher, args.publishers));
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
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: mangaAuthor.catalogItemId })
                .from(mangaAuthor).where(inArray(mangaAuthor.name, args.authors))));
        }
        if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
            const currentEntry = alias(libraryEntry, "current_manga_library_entry");
            conditions.push(notInArray(catalogItem.id, getDbClient().select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry).where(eq(currentEntry.userId, currentUserId))));
        }
        return conditions;
    }

    private sortExpressions(sorting: typeof MANGA_LIST_SORTS[number]): SQL[] {
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
            "Re-Read": [desc(mangaProgress.rereadCount), name, itemId],
            "Chapters +": [desc(mangaDetails.chapters), name, itemId],
            "Chapters -": [asc(mangaDetails.chapters), name, itemId],
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
            if (!isMangaStatus(row.status)) throw new Error(`Invalid manga library status: ${row.status}`);
            return {
                ...row,
                kind: MediaType.MANGA,
                customCover: customCover ? getImageUrl("manga-covers", customCover) : null,
                imageCover: getImageUrl("manga-covers", customCover ?? imageCover),
                tags: tags.filter((tag) => tag.libraryEntryId === row.id)
                    .map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }
}
