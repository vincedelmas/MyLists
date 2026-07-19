import {and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, ne, or, sql, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameCompany, gameDetails, gameProgress, libraryEntry, user} from "@/lib/server/database/schema";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {GameProgressState, isGameStatus} from "@/lib/server/domain/media/games/library/game-progress";
import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {GameCommunityActivityPage} from "@/lib/contracts/media/community";
import {GameListArgs, GameListPage} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {getLibraryCommunityActivity} from "@/lib/server/domain/media/shared/library/library-community-activity";
import {
    findFollowedUsersLibraryMedia,
    findLibraryUserMedia,
    getCommonLibraryListConditions,
    getLibraryEntryTags,
    getLibraryGenresAndTags,
    getLibraryListItemRelations,
} from "@/lib/server/domain/media/shared/library/library-shared-queries";

export type GameLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: typeof MediaType.GAMES;
    name: string;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    customCover: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    progress: GameProgressState;
};

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

export class GameLibraryRepository {
    constructor(private readonly common = new CommonLibraryRepository(MediaType.GAMES)) {
    }

    async findEntry(userId: number, catalogItemId: number): Promise<GameLibraryEntry | undefined> {
        const row = getDbClient()
            .select({
                ...getTableColumns(libraryEntry),
                kind: catalogItem.kind,
                name: catalogItem.name,
                playtimeMinutes: gameProgress.playtimeMinutes,
                platform: gameProgress.platform,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(libraryEntry.catalogItemId, catalogItemId)))
            .get();
        if (!row || row.kind !== MediaType.GAMES || !isGameStatus(row.status)) return;

        return {
            id: row.id,
            userId: row.userId,
            catalogItemId: row.catalogItemId,
            kind: MediaType.GAMES,
            name: row.name,
            favorite: row.favorite,
            comment: row.comment,
            rating: row.rating,
            customCover: row.customCover,
            addedAt: row.addedAt,
            updatedAt: row.updatedAt,
            progress: {
                status: row.status,
                playtimeMinutes: row.playtimeMinutes,
                platform: row.platform,
            },
        };
    }

    async getGameCatalogItem(catalogItemId: number) {
        const row = await getDbClient().select({
            id: catalogItem.id,
            kind: catalogItem.kind,
            name: catalogItem.name,
        }).from(catalogItem)
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId)).get();
        return row?.kind === MediaType.GAMES ? { ...row, kind: MediaType.GAMES } : undefined;
    }

    async createEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        progress: GameProgressState;
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
        await getDbClient().insert(gameProgress).values({
            libraryEntryId: entryId,
            playtimeMinutes: params.progress.playtimeMinutes,
            platform: params.progress.platform,
        });
        return entryId;
    }

    async saveProgress(entryId: number, progress: GameProgressState) {
        await this.common.updateEntry(entryId, { status: progress.status });

        await getDbClient()
            .update(gameProgress)
            .set({
                playtimeMinutes: progress.playtimeMinutes,
                platform: progress.platform,
            }).where(eq(gameProgress.libraryEntryId, entryId));
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
            MediaType.GAMES,
            viewerId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<GameCommunityActivityPage> {
        return getLibraryCommunityActivity({
            kind: MediaType.GAMES,
            viewerId,
            catalogItemId,
            search,
            findEntry: (userId, mediaId) => this.findEntry(userId, mediaId),
            toUserMedia: (entry, mediaId, ratingSystem) => this.toUserMedia(entry, mediaId, ratingSystem, false),
            getContribution: (entry) => ({
                redo: 0,
                specific: 0,
                playtime: entry.progress.playtimeMinutes,
            }),
        });
    }

    private async toUserMedia(
        entry: GameLibraryEntry,
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
            customCover: entry.customCover ? getImageUrl("games-covers", entry.customCover) : null,
            addedAt: entry.addedAt,
            lastUpdated: entry.updatedAt,
            playtime: entry.progress.playtimeMinutes,
            platform: entry.progress.platform,
        };
        return { ...userMedia, ratingSystem, tags: tags ?? [] };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: GameListArgs): Promise<GameListPage> {
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
            kind: MediaType.GAMES,
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
        const [{ genres, tags }, platforms] = await Promise.all([
            getLibraryGenresAndTags(MediaType.GAMES, ownerId),
            getDbClient().selectDistinct({ name: gameProgress.platform }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, MediaType.GAMES),
                    isNotNull(gameProgress.platform),
                )),
        ]);
        return { kind: MediaType.GAMES, genres, tags, platforms: platforms as { name: NonNullable<typeof gameProgress.$inferSelect.platform> }[] };
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

    getUpcomingMedia(access: MediaListAccessScope) {
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
                eq(libraryEntry.userId, access.ownerId),
                or(isNull(catalogItem.releaseDate), gte(catalogItem.releaseDate, sql`date('now')`)),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("games-covers", imageCover),
            })));
    }

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: GameListArgs) {
        const conditions = getCommonLibraryListConditions(MediaType.GAMES, currentUserId, ownerId, args);
        if (args.platforms?.length) conditions.push(inArray(gameProgress.platform, args.platforms));
        if (args.companies?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient().select({ catalogItemId: gameCompany.catalogItemId })
                .from(gameCompany).where(inArray(gameCompany.name, args.companies))));
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
        const { tags, commonIds } = await getLibraryListItemRelations(
            entryIds,
            catalogItemIds,
            currentUserId,
            ownerId,
        );
        return rows.map(({ catalogItemId, imageCover, customCover, ...row }) => {
            if (!isGameStatus(row.status)) throw new Error(`Invalid game library status: ${row.status}`);
            return {
                ...row,
                kind: MediaType.GAMES,
                customCover: customCover ? getImageUrl("games-covers", customCover) : null,
                imageCover: getImageUrl("games-covers", customCover ?? imageCover),
                tags: tags.filter((tag) => tag.libraryEntryId === row.id)
                    .map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }

}
