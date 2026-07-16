import {and, eq, getTableColumns} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameDetails, gameProgress, libraryEntry} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {LibraryCommonRepository} from "@/lib/server/domain/library/library-common.repository";
import {GameProgressState, isGameStatus} from "@/lib/server/domain/library/games/game-progress";


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


export class GameLibraryRepository {
    readonly common = new LibraryCommonRepository();

    async findEntry(userId: number, catalogItemId: number): Promise<GameLibraryEntry | undefined> {
        const row = await getDbClient().select({
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
        await getDbClient().update(gameProgress).set({
            playtimeMinutes: progress.playtimeMinutes,
            platform: progress.platform,
        }).where(eq(gameProgress.libraryEntryId, entryId));
    }
}
