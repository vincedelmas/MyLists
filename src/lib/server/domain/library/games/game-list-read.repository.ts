import {
    and,
    asc,
    count,
    desc,
    eq,
    gte,
    inArray,
    isNotNull,
    isNull,
    like,
    lte,
    ne,
    notInArray,
    or,
    SQL,
    sql,
} from "drizzle-orm";
import {alias} from "drizzle-orm/sqlite-core";
import {MediaListArgs, SimpleSearch} from "@/lib/schemas";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {isGameStatus} from "@/lib/server/domain/library/games/game-progress";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gameProgress,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";


export const GAME_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Release Date +",
    "Release Date -",
    "IGDB Rating +",
    "IGDB Rating -",
    "Recently Added",
    "Recently Modified",
    "Rating +",
    "Rating -",
    "Playtime +",
    "Playtime -",
] as const;


/** Concrete game list query; selected platform and playtime are entry state. */
export class GameListReadRepository {
    async getListHeader(userId: number) {
        const channel = await getDbClient().select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel).where(and(
                eq(profileMediaChannel.userId, userId),
                eq(profileMediaChannel.kind, MediaType.GAMES),
            )).get();
        if (!channel?.enabled) return;
        const stats = await getDbClient().select({ timeSpent: libraryStats.timeSpentMinutes })
            .from(libraryStats).where(and(
                eq(libraryStats.userId, userId),
                eq(libraryStats.kind, MediaType.GAMES),
            )).get();
        return { timeSpent: stats?.timeSpent ?? 0 };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: MediaListArgs) {
        const ownerId = access.ownerId;
        const { page, perPage, offset, limit } = resolvePagination(args);
        const sorting = resolveSorting(args.sorting, GAME_LIST_SORTS, "Playtime +");
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
                playtime: gameProgress.playtimeMinutes,
                platform: gameProgress.platform,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                ratingSystem: user.ratingSystem,
            }).from(libraryEntry)
                .innerJoin(user, eq(user.id, libraryEntry.userId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
                .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions))
                .orderBy(...this.sortExpressions(sorting))
                .limit(limit).offset(offset),
            getDbClient().select({ value: count() }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
                .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
                .where(and(...conditions)).get(),
        ]);
        const items = await this.hydrateItems(rows, currentUserId, ownerId);
        const totalItems = totalRow?.value ?? 0;
        return {
            items,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil(totalItems / perPage),
                totalItems,
                sorting,
                availableSorting: [...GAME_LIST_SORTS],
            },
        };
    }

    async getListFilters(access: MediaListAccessScope) {
        const ownerId = access.ownerId;
        const [genres, tags, platforms] = await Promise.all([
            getDbClient().selectDistinct({ name: catalogGenre.name }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.GAMES)))
                .orderBy(asc(catalogGenre.name)),
            getDbClient().select({ name: libraryTag.name }).from(libraryTag)
                .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, MediaType.GAMES)))
                .orderBy(asc(libraryTag.name)),
            getDbClient().selectDistinct({ name: gameProgress.platform }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.GAMES),
                    isNotNull(gameProgress.platform),
                )),
        ]);
        return { genres, tags, platforms: platforms as { name: NonNullable<typeof gameProgress.$inferSelect.platform> }[] };
    }

    async getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        if (job !== JobType.CREATOR && job !== JobType.PUBLISHER) return [];
        return getDbClient().selectDistinct({ name: gameCompany.name }).from(gameCompany)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, gameCompany.catalogItemId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, access.ownerId),
                eq(catalogItem.kind, MediaType.GAMES),
                job === JobType.CREATOR ? eq(gameCompany.developer, true) : eq(gameCompany.publisher, true),
                like(gameCompany.name, `%${query}%`),
            ));
    }

    async getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        const ownerId = access.ownerId;
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const tagRows = await getDbClient().select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag).where(and(
                eq(libraryTag.userId, ownerId),
                eq(libraryTag.kind, MediaType.GAMES),
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
                    mediaCover: getImageUrl("games-covers", mediaCover),
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

    getUpcomingMedia(access: MediaListAccessScope) {
        return this.queryUpcomingMedia(access.ownerId, false);
    }

    getUpcomingMediaForNotifications() {
        return this.queryUpcomingMedia(undefined, true);
    }

    private queryUpcomingMedia(ownerId: number | undefined, maxAWeek: boolean) {
        return getDbClient().select({
            mediaId: catalogItem.id,
            userId: libraryEntry.userId,
            status: libraryEntry.status,
            mediaName: catalogItem.name,
            date: catalogItem.releaseDate,
            imageCover: catalogItem.imageCover,
        }).from(catalogItem)
            .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                ne(libraryEntry.status, Status.DROPPED),
                ownerId !== undefined ? eq(libraryEntry.userId, ownerId) : undefined,
                maxAWeek
                    ? and(gte(catalogItem.releaseDate, sql`date('now')`), lte(catalogItem.releaseDate, sql`date('now', '+7 days')`))
                    : or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now')`)),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("games-covers", imageCover),
            })));
    }

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: MediaListArgs) {
        const conditions: SQL[] = [eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, MediaType.GAMES)];
        if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
        if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
        if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
        if (args.status?.length) conditions.push(inArray(libraryEntry.status, args.status));
        if (args.platforms?.length) conditions.push(inArray(gameProgress.platform, args.platforms));
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
        if (args.companies?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: gameCompany.catalogItemId })
                .from(gameCompany).where(inArray(gameCompany.name, args.companies))));
        }
        if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
            const currentEntry = alias(libraryEntry, "current_game_library_entry");
            conditions.push(notInArray(catalogItem.id, getDbClient().select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry).where(eq(currentEntry.userId, currentUserId))));
        }
        return conditions;
    }

    private sortExpressions(sorting: typeof GAME_LIST_SORTS[number]): SQL[] {
        const name = asc(catalogItem.name);
        const itemId = asc(catalogItem.id);
        const sorts: Record<typeof sorting, SQL[]> = {
            "Title A-Z": [name, itemId],
            "Title Z-A": [desc(catalogItem.name), itemId],
            "Release Date +": [desc(catalogItem.releaseDate), name, itemId],
            "Release Date -": [sql`${catalogItem.releaseDate} ASC NULLS LAST`, name, itemId],
            "IGDB Rating +": [desc(gameDetails.voteAverage), name, itemId],
            "IGDB Rating -": [asc(gameDetails.voteAverage), name, itemId],
            "Recently Added": [desc(libraryEntry.addedAt), name, itemId],
            "Recently Modified": [desc(libraryEntry.updatedAt), name, itemId],
            "Rating +": [desc(libraryEntry.rating), name, itemId],
            "Rating -": [asc(libraryEntry.rating), name, itemId],
            "Playtime +": [desc(gameProgress.playtimeMinutes), name, itemId],
            "Playtime -": [asc(gameProgress.playtimeMinutes), name, itemId],
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
            if (!isGameStatus(row.status)) throw new Error(`Invalid game library status: ${row.status}`);
            return {
                ...row,
                customCover: customCover ? getImageUrl("games-covers", customCover) : null,
                imageCover: getImageUrl("games-covers", customCover ?? imageCover),
                tags: tags.filter((tag) => tag.libraryEntryId === row.id)
                    .map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }
}
