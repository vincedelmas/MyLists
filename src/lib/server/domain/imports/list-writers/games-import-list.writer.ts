import {ImportItemStatus} from "@/lib/utils/enums";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {gamesFinalListInsertSchema, GamesImportPayload, gamesImportPayloadSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {GameLibraryCommands} from "@/lib/server/domain/library/games/game-library.commands";


export class GamesImportListWriter implements ImportListWriter {
    constructor(private libraryCommands: GameLibraryCommands) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userGames = matches.map(({ item, mediaId }) => {
            const payload = gamesImportPayloadSchema.parse(item.payload);
            return gamesFinalListInsertSchema.parse({
                userId,
                mediaId,
                ...this._materializeGameListPayload(payload),
            });
        });

        await this.libraryCommands.importRows(userGames);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeGameListPayload = (payload: GamesImportPayload) => {
        return {
            ...payload,
            playtime: payload.playtime ?? 0,
        };
    };
}
