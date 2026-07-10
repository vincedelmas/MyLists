import {describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MatchedImportItem} from "@/lib/types/imports.types";
import {MangaImportListWriter} from "@/lib/server/domain/imports/list-writers/manga-import-list.writer";


describe("MangaImportListWriter", () => {
    it("materializes completed manga defaults from matched media chapters", async () => {
        const mangaService = {
            bulkInsertUserMedia: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue({
                id: 100,
                apiId: 2,
                name: "Berserk",
                chapters: 375,
            }),
        };
        const writer = new MangaImportListWriter(mangaService as any);

        const matches: MatchedImportItem[] = [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "Berserk",
                releaseDate: "1989",
                statusReason: null,
                externalApiId: "2",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.MANGA,
                mediaType: MediaType.MANGA,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: { status: Status.COMPLETED },
            },
        }];

        await writer.addMatchedItems(42, matches);

        expect(mangaService.bulkInsertUserMedia).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
            redo: 0,
            total: 375,
            currentChapter: 375,
        }]);
    });
});
