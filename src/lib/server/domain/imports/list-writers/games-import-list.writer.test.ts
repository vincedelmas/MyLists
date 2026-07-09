import {describe, expect, it, vi} from "vitest";
import {GamesImportListWriter} from "@/lib/server/domain/imports/list-writers/games-import-list.writer";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MatchedImportItem} from "@/lib/types/imports.types";


describe("GamesImportListWriter", () => {
    it("materializes missing game defaults before inserting matched items", async () => {
        const gamesService = {
            bulkInsertUserMedia: vi.fn().mockResolvedValue([]),
        };
        const writer = new GamesImportListWriter(gamesService as any);

        const matches: MatchedImportItem[] = [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "Game",
                releaseDate: "2024",
                statusReason: null,
                externalApiId: "123",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.IGDB,
                mediaType: MediaType.GAMES,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: { status: Status.PLAYING, platform: "PC" },
            },
        }];

        await writer.addMatchedItems(42, matches);

        expect(gamesService.bulkInsertUserMedia).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.PLAYING,
            platform: "PC",
            playtime: 0,
        }]);
    });
});
