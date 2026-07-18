import {describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MatchedImportItem} from "@/lib/types/imports.types";
import {TvImportListWriter} from "@/lib/server/domain/media/tv/imports/tv-import-list.writer";


describe("TvImportListWriter", () => {
    it("materializes completed TV defaults from matched media seasons", async () => {
        const tvCatalog = {
            getEpisodesPerSeason: vi.fn().mockResolvedValue([
                { season: 1, episodes: 8 },
                { season: 2, episodes: 10 },
                { season: 3, episodes: 10 },
            ]),
        };
        const libraryWriter = { importRows: vi.fn().mockResolvedValue(undefined) };
        const writer = new TvImportListWriter(tvCatalog as any, MediaType.SERIES, libraryWriter as any);

        const matches: MatchedImportItem[] = [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "The Bear",
                releaseDate: "2022",
                statusReason: null,
                externalApiId: "136315",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.TMDB,
                mediaType: MediaType.SERIES,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: { status: Status.COMPLETED },
            },
        }];

        await writer.addMatchedItems(42, matches);

        expect(libraryWriter.importRows).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
            redo: 0,
            redo2: [0, 0, 0],
            total: 28,
            currentSeason: 3,
            currentEpisode: 10,
        }]);
    });

    it("preserves complete MyLists TV progress payloads", async () => {
        const tvCatalog = {
            getEpisodesPerSeason: vi.fn().mockResolvedValue([{ season: 1, episodes: 28 }]),
        };
        const libraryWriter = { importRows: vi.fn().mockResolvedValue(undefined) };
        const writer = new TvImportListWriter(tvCatalog as any, MediaType.ANIME, libraryWriter as any);

        await writer.addMatchedItems(42, [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "Frieren",
                releaseDate: "2023",
                statusReason: null,
                externalApiId: "209867",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.TMDB,
                mediaType: MediaType.ANIME,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: {
                    status: Status.WATCHING,
                    currentSeason: 1,
                    currentEpisode: 12,
                    redo: 1,
                    redo2: [1],
                    total: 40,
                    rating: 9,
                },
            },
        }]);

        expect(libraryWriter.importRows).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.WATCHING,
            currentSeason: 1,
            currentEpisode: 12,
            redo: 1,
            redo2: [1],
            total: 40,
            rating: 9,
        }]);
    });
});
