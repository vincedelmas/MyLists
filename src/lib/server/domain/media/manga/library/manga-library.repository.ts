import {and, eq, getTableColumns, asc, desc, sql, count, inArray, isNotNull, like, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaDetails, mangaProgress, user, mangaAuthor} from "@/lib/server/database/schema";
import {MediaType, Status, JobType} from "@/lib/utils/enums";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {isMangaStatus, MangaProgressState} from "@/lib/server/domain/media/manga/library/manga-progress";
import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MangaCommunityActivityPage} from "@/lib/contracts/media/community";
import {MangaListArgs, MangaListPage} from "@/lib/contracts/media/lists";
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

export class MangaLibraryRepository {
    constructor(private readonly common = new CommonLibraryRepository(MediaType.MANGA)) {
    }

    async findEntriesByCatalogItem(catalogItemId: number) {
        return findLibraryEntriesByCatalogItem(
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
        );
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
            MediaType.MANGA,
            viewerId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<MangaCommunityActivityPage> {
        return getLibraryCommunityActivity({
            kind: MediaType.MANGA,
            viewerId,
            catalogItemId,
            search,
            findEntry: (userId, mediaId) => this.findEntry(userId, mediaId),
            toUserMedia: (entry, mediaId, ratingSystem) => this.toUserMedia(entry, mediaId, ratingSystem, false),
            getContribution: (entry) => ({
                redo: entry.progress.rereadCount,
                specific: entry.progress.totalChaptersRead,
                playtime: 0,
            }),
        });
    }

    private async toUserMedia(
        entry: MangaLibraryEntry,
        catalogItemId: number,
        ratingSystem: typeof user.$inferSelect.ratingSystem,
        includeTags: boolean,
    ) {
        const tags = includeTags ? await getLibraryEntryTags(entry.id) : undefined;
        const userMedia = {
            id: entry.id,
            userId: entry.userId,
            mediaId: catalogItemId,
            status: entry.progress.status,
            favorite: entry.favorite,
            comment: entry.comment,
            rating: entry.rating,
            customCover: entry.customCover ? getImageUrl("manga-covers", entry.customCover) : null,
            addedAt: entry.addedAt,
            lastUpdated: entry.updatedAt,
            currentChapter: entry.progress.currentChapter,
            rereadCount: entry.progress.rereadCount,
            totalChaptersRead: entry.progress.totalChaptersRead,
        };
        return { ...userMedia, ratingSystem, tags: tags ?? [] };
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
        const { genres, tags } = await getLibraryGenresAndTags(MediaType.MANGA, access.ownerId);
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

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: MangaListArgs) {
        const conditions = getCommonLibraryListConditions(MediaType.MANGA, currentUserId, ownerId, args);
        if (args.publishers?.length) conditions.push(inArray(mangaDetails.publisher, args.publishers));
        if (args.authors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: mangaAuthor.catalogItemId })
                .from(mangaAuthor).where(inArray(mangaAuthor.name, args.authors))));
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
        const { tags, commonIds } = await getLibraryListItemRelations(
            entryIds,
            catalogItemIds,
            currentUserId,
            ownerId,
        );
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
