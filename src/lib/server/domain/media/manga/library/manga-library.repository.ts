import {and, eq, getTableColumns, asc, desc, ne, sql, count, inArray, isNotNull, like, notInArray, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaDetails, mangaProgress, followers, libraryChange, libraryEntryTag, libraryTag, profileMediaChannel, user, catalogGenre, catalogItemGenre, libraryStats, mangaAuthor} from "@/lib/server/database/schema";
import {MediaType, Status, PrivacyType, SocialState, JobType} from "@/lib/utils/enums";
import {
    createLibraryEntry,
    editLibraryTag,
    getLibraryStats,
    recordLibraryActivity,
    recordLibraryChange,
    removeLibraryEntry,
    saveLibraryStats,
    synchronizeLibraryProfileChannel,
    updateLibraryEntry,
} from "@/lib/server/domain/media/shared/library/library-persistence";
import {isMangaStatus, MangaProgressState} from "@/lib/server/domain/media/manga/library/manga-progress";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {MangaCommunityActivityPage} from "@/lib/contracts/media/community";
import {alias} from "drizzle-orm/sqlite-core";
import {MangaListArgs, MangaListPage} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";

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
    readonly updateCommonFields = updateLibraryEntry;
    readonly removeEntry = removeLibraryEntry;
    readonly saveStats = saveLibraryStats;
    readonly recordChange = recordLibraryChange;
    readonly recordActivity = recordLibraryActivity;

    getStats(userId: number) {
        return getLibraryStats(userId, MediaType.MANGA);
    }

    synchronizeProfileChannel(userId: number, enabled: boolean, views: number) {
        return synchronizeLibraryProfileChannel(userId, MediaType.MANGA, enabled, views);
    }

    editTag(params: Omit<Parameters<typeof editLibraryTag>[0], "kind">) {
        return editLibraryTag({ ...params, kind: MediaType.MANGA });
    }

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
        const entryId = await createLibraryEntry({
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
        await updateLibraryEntry(entryId, { status: progress.status });
        await getDbClient().update(mangaProgress).set({
            currentChapter: progress.currentChapter,
            rereadCount: progress.rereadCount,
            totalChaptersRead: progress.totalChaptersRead,
        }).where(eq(mangaProgress.libraryEntryId, entryId));
    }



    async getUserMediaHistory(userId: number, catalogItemId: number) {
        const rows = await getDbClient().select({
            id: libraryChange.id,
            userId: libraryEntry.userId,
            mediaId: catalogItem.id,
            mediaName: catalogItem.name,
            mediaType: catalogItem.kind,
            updateType: libraryChange.updateType,
            payload: libraryChange.payload,
            timestamp: libraryChange.occurredAt,
        }).from(libraryChange)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, MediaType.MANGA),
                eq(catalogItem.id, catalogItemId),
            ))
            .orderBy(desc(libraryChange.occurredAt), desc(libraryChange.id));
        return rows.map((row) => ({
            ...row,
            id: row.id,
            payload: row.payload,
        }));
    }

    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        if (!userId) return null;
        const [entry, owner] = await Promise.all([
            this.findEntry(userId, catalogItemId),
            getDbClient().select({ ratingSystem: user.ratingSystem }).from(user).where(eq(user.id, userId)).get(),
        ]);
        if (!entry || !owner) return null;
        return this.toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        if (!viewerId) return [];
        const followedOwners = await getDbClient().select({
            id: user.id,
            name: user.name,
            image: user.image,
            ratingSystem: user.ratingSystem,
        }).from(followers)
            .innerJoin(user, eq(user.id, followers.followedId))
            .innerJoin(libraryEntry, and(
                eq(libraryEntry.userId, followers.followedId),
                eq(libraryEntry.catalogItemId, catalogItemId),
            ))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, followers.followedId),
                eq(profileMediaChannel.kind, MediaType.MANGA),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(eq(followers.followerId, viewerId), eq(followers.status, SocialState.ACCEPTED)))
            .orderBy(asc(user.name));
        const results = await Promise.all(followedOwners.map(async (owner) => {
            const entry = await this.findEntry(owner.id, catalogItemId);
            if (!entry) return;
            return { ...owner, userMedia: await this.toUserMedia(entry, catalogItemId, owner.ratingSystem, false) };
        }));
        return results.filter((result): result is NonNullable<typeof result> => !!result);
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<MangaCommunityActivityPage> {
        const pagination = resolvePagination({ page: search.page, perPage: search.perPage, defaultPerPage: 8, maxPerPage: 50 });
        const audienceCondition = viewerId
            ? sql`(
                ${user.privacy} IN (${PrivacyType.PUBLIC}, ${PrivacyType.RESTRICTED})
                OR ${user.id} = ${viewerId}
                OR EXISTS (
                    SELECT 1 FROM ${followers} AS community_follow
                    WHERE community_follow.follower_id = ${viewerId}
                        AND community_follow.followed_id = ${user.id}
                        AND community_follow.status = ${SocialState.ACCEPTED}
                )
            )`
            : eq(user.privacy, PrivacyType.PUBLIC);
        const visibleConditions = and(
            eq(libraryEntry.catalogItemId, catalogItemId),
            ne(user.name, "DemoProfile"),
            audienceCondition,
        );
        const baseQuery = () => getDbClient().select({
            userId: user.id,
            name: user.name,
            image: user.image,
            ratingSystem: user.ratingSystem,
            favorite: libraryEntry.favorite,
            rating: libraryEntry.rating,
            status: libraryEntry.status,
        }).from(libraryEntry)
            .innerJoin(user, eq(user.id, libraryEntry.userId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryEntry.userId),
                eq(profileMediaChannel.kind, MediaType.MANGA),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(visibleConditions);
        const [allRows, pageRows] = await Promise.all([
            baseQuery(),
            baseQuery().orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`))
                .limit(pagination.limit).offset(pagination.offset),
        ]);
        const entries = await Promise.all(allRows.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        const completeEntries = entries.filter((entry): entry is MangaLibraryEntry => !!entry);
        const ratings = allRows.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
        const items = await Promise.all(pageRows.map(async (row) => {
            const entry = await this.findEntry(row.userId, catalogItemId);
            if (!entry) return;
            const userMedia = await this.toUserMedia(entry, catalogItemId, row.ratingSystem, false);
            return {
                kind: MediaType.MANGA,
                id: row.userId,
                name: row.name,
                image: row.image,
                ratingSystem: row.ratingSystem,
                userMedia: { ...userMedia, kind: MediaType.MANGA, comment: null },
            };
        }));
        const total = allRows.length;
        return {
            kind: MediaType.MANGA,
            page: pagination.page,
            items: items.filter((item): item is NonNullable<typeof item> => !!item),
            total,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
            stats: {
                total,
                totalRedo: completeEntries.reduce((sum, entry) => sum + entry.progress.rereadCount, 0),
                likedCount: allRows.filter(({ favorite }) => favorite).length,
                totalSpecific: completeEntries.reduce((sum, entry) => sum + entry.progress.totalChaptersRead, 0),
                totalPlaytime: 0,
                completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
                averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
            },
        };
    }

    private async toUserMedia(
        entry: MangaLibraryEntry,
        catalogItemId: number,
        ratingSystem: typeof user.$inferSelect.ratingSystem,
        includeTags: boolean,
    ) {
        const tags = includeTags
            ? await getDbClient().select({ name: libraryTag.name }).from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(eq(libraryEntryTag.libraryEntryId, entry.id))
                .orderBy(asc(libraryTag.name))
            : undefined;
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

    getTagNames(userId: number) {
        return getDbClient().select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, MediaType.MANGA)))
            .orderBy(asc(libraryTag.name));
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
