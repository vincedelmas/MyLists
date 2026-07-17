import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameDetails} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {hasDefinedCatalogFields} from "@/lib/server/domain/catalog/catalog-admin-fields";


export type GameCatalogEdit = Partial<{
    name: string;
    releaseDate: string | null;
    synopsis: string | null;
    lockStatus: boolean;
    imageCover: string;
    gameEngine: string | null;
    gameModes: string | null;
    playerPerspective: string | null;
    hltbMainTime: number | null;
    hltbMainAndExtraTime: number | null;
    hltbTotalCompleteTime: number | null;
}>;


export class GameCatalogAdminRepository {
    async getEditableFields(catalogItemId: number) {
        const row = await this.findById(catalogItemId);
        if (!row) return;
        return {
            kind: MediaType.GAMES,
            fields: {
                name: row.name,
                gameEngine: row.gameEngine,
                gameModes: row.gameModes,
                playerPerspective: row.playerPerspective,
                releaseDate: row.releaseDate,
                synopsis: row.synopsis,
                hltbMainTime: row.hltbMainHours,
                hltbMainAndExtraTime: row.hltbMainExtraHours,
                hltbTotalCompleteTime: row.hltbCompletionistHours,
                lockStatus: row.locked,
            },
        };
    }

    async synchronizeCollectionExternalIds(updates: { apiId: number; collectionId: number | null }[]) {
        if (updates.length === 0) return;
        const byExternalId = new Map(updates.map((item) => [String(item.apiId), item.collectionId]));
        const items = await getDbClient().select({
            id: catalogItem.id,
            externalId: catalogItem.primaryExternalId,
        }).from(catalogItem).where(and(
            eq(catalogItem.kind, MediaType.GAMES),
            eq(catalogItem.primaryProvider, "igdb"),
            inArray(catalogItem.primaryExternalId, [...byExternalId.keys()]),
        ));
        if (items.length === 0) return;

        const cases = items.map((item) => sql`WHEN ${gameDetails.catalogItemId} = ${item.id} THEN ${byExternalId.get(item.externalId) ?? null}`);
        await getDbClient().update(gameDetails).set({
            collectionExternalId: sql`CASE ${sql.join(cases, sql` `)} ELSE ${gameDetails.collectionExternalId} END`,
        }).where(inArray(gameDetails.catalogItemId, items.map(({ id }) => id)));
    }

    async updateEditableFields(catalogItemId: number, edit: GameCatalogEdit) {
        const catalogFields = {
            name: edit.name,
            releaseDate: edit.releaseDate,
            synopsis: edit.synopsis,
            locked: edit.lockStatus,
            imageCover: edit.imageCover ? getImageFilename(edit.imageCover) : undefined,
        };
        const detailFields = {
            gameEngine: edit.gameEngine,
            gameModes: edit.gameModes,
            playerPerspective: edit.playerPerspective,
            hltbMainHours: edit.hltbMainTime,
            hltbMainExtraHours: edit.hltbMainAndExtraTime,
            hltbCompletionistHours: edit.hltbTotalCompleteTime,
        };
        if (hasDefinedCatalogFields(catalogFields)) {
            await getDbClient().update(catalogItem).set(catalogFields).where(eq(catalogItem.id, catalogItemId));
        }
        if (hasDefinedCatalogFields(detailFields)) {
            await getDbClient().update(gameDetails).set(detailFields).where(eq(gameDetails.catalogItemId, catalogItemId));
        }
        return true;
    }

    private findById(catalogItemId: number) {
        return getDbClient().select({
            name: catalogItem.name,
            releaseDate: catalogItem.releaseDate,
            synopsis: catalogItem.synopsis,
            locked: catalogItem.locked,
            gameEngine: gameDetails.gameEngine,
            gameModes: gameDetails.gameModes,
            playerPerspective: gameDetails.playerPerspective,
            hltbMainHours: gameDetails.hltbMainHours,
            hltbMainExtraHours: gameDetails.hltbMainExtraHours,
            hltbCompletionistHours: gameDetails.hltbCompletionistHours,
        }).from(catalogItem)
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.id, catalogItemId),
            )).get();
    }
}
