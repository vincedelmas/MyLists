import {describe, expect, it, vi} from "vitest";
import {MoviesImportListWriter} from "@/lib/server/domain/imports/list-writers/movies-import-list.writer";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MatchedImportItem} from "@/lib/types/imports.types";


describe("MoviesImportListWriter", () => {
    it("materializes missing movie defaults before inserting matched items", async () => {
        const moviesService = {
            bulkInsertUserMedia: vi.fn().mockResolvedValue([]),
        };
        const writer = new MoviesImportListWriter(moviesService as any);

        const matches: MatchedImportItem[] = [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "Movie",
                releaseDate: "2024",
                statusReason: null,
                externalApiId: "550",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.TMDB,
                mediaType: MediaType.MOVIES,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: { status: Status.COMPLETED },
            },
        }];

        await writer.addMatchedItems(42, matches);

        expect(moviesService.bulkInsertUserMedia).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
            redo: 0,
            total: 1,
        }]);
    });
});
