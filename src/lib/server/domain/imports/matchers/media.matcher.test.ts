import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, ImportItemsSelect} from "@/lib/types/imports.types";
import {createImportListWriter, type MediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {createTvMatcher} from "@/lib/server/domain/media/tv/tv.matcher";
import {createBooksMatcher} from "@/lib/server/domain/media/books/books.matcher";
import {createGamesMatcher} from "@/lib/server/domain/media/games/games.matcher";
import {createMangaMatcher} from "@/lib/server/domain/media/manga/manga.matcher";
import {createMoviesMatcher} from "@/lib/server/domain/media/movies/movies.matcher";


describe.each(Object.values(MediaType))("%s import matching", (mediaType) => {
    let matcher: MediaMatcher;
    let item: ImportItemsSelect;
    let service: any;
    let provider: any;
    let ingestion: any;

    beforeEach(() => {
        service = {
            findByApiIds: vi.fn().mockResolvedValue([]),
            findByNames: vi.fn().mockResolvedValue([{ id: 100, name: "Requested Title", releaseDate: "2024-01-01" }]),
            findById: vi.fn().mockImplementation((id) => ({ id, pages: 100, chapters: 100 })),
            getMediaEpsPerSeason: vi.fn().mockReturnValue([{ season: 1, episodes: 10 }]),
            bulkInsertUserMedia: vi.fn().mockResolvedValue([]),
        };
        provider = { search: vi.fn().mockResolvedValue({ data: [], hasNextPage: false }) };
        ingestion = {
            storeFromExternal: vi.fn().mockResolvedValue(200),
            storeBatchFromExternal: vi.fn().mockResolvedValue(new Map([["200", 200]])),
        };
        const externalApiSource = mediaType === MediaType.GAMES ? ApiProviderType.IGDB
            : mediaType === MediaType.MANGA ? ApiProviderType.MANGA
                : mediaType === MediaType.BOOKS ? ApiProviderType.BOOKS
                    : ApiProviderType.TMDB;

        item = {
            id: 1,
            jobId: 10,
            rowNumber: 2,
            mediaType,
            externalApiSource,
            externalApiId: "200",
            name: "Requested Title",
            releaseDate: "2024",
            statusReason: null,
            matchedMediaId: null,
            status: ImportItemStatus.PROCESSING,
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
            payload: {
                status: Status.COMPLETED,
                ...(mediaType === MediaType.SERIES || mediaType === MediaType.ANIME
                    ? { firstWatchProgress: 10, seasons: [{ season: 1, redo: 0, rating: null }] }
                    : {}),
            },
        };

        switch (mediaType) {
            case MediaType.BOOKS: matcher = createBooksMatcher(service, provider, ingestion); break;
            case MediaType.GAMES: matcher = createGamesMatcher(service, ingestion); break;
            case MediaType.MANGA: matcher = createMangaMatcher(service, provider, ingestion); break;
            case MediaType.MOVIES: matcher = createMoviesMatcher(service, provider, ingestion); break;
            default: matcher = createTvMatcher(mediaType, service, provider, ingestion);
        }
    });

    const processItem = async () => {
        const outcomes: ImportItemOutcome[] = [];
        for await (const batch of matcher.match({ userId: 42, jobId: 10 }, [item])) outcomes.push(...batch);
        return outcomes;
    };

    it("fetches the supplied ID before accepting a different local title/date match", async () => {
        expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: 200, status: ImportItemStatus.COMPLETED }]);
        expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining({ userId: 42, mediaId: 200 })]);
        expect(provider.search).not.toHaveBeenCalled();
        expect(service.findByNames).not.toHaveBeenCalled();
        if (mediaType === MediaType.GAMES) expect(ingestion.storeBatchFromExternal).toHaveBeenCalledWith(["200"], false);
        else if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            expect(ingestion.storeFromExternal).toHaveBeenCalledWith("200", false, true);
        }
        else expect(ingestion.storeFromExternal).toHaveBeenCalledWith("200", false);
    });

    if (mediaType === MediaType.MOVIES) {
        it("resolves the IMDb ID before accepting a different local title/year match", async () => {
            item.externalApiId = null;
            item.externalApiSource = null;
            item.payload.imdbId = "tt1234567";
            provider.findMovieIdsByImdbId = vi.fn().mockResolvedValue([550]);

            expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: 200, status: ImportItemStatus.COMPLETED }]);
            expect(provider.findMovieIdsByImdbId).toHaveBeenCalledWith("tt1234567");
            expect(ingestion.storeFromExternal).toHaveBeenCalledWith(550, true);
            expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining({ userId: 42, mediaId: 200 })]);
            expect(service.findByNames).not.toHaveBeenCalled();
            expect(provider.search).not.toHaveBeenCalled();
        });

        it.each([
            { resolution: "unresolved", candidateIds: [] },
            { resolution: "ambiguous", candidateIds: [550, 551] },
        ])("skips $resolution IMDb IDs without accepting a local title/year match", async ({ candidateIds }) => {
            item.externalApiId = null;
            item.externalApiSource = null;
            item.payload.imdbId = "tt1234567";
            provider.findMovieIdsByImdbId = vi.fn().mockResolvedValue(candidateIds);

            expect(await processItem()).toEqual([{
                itemId: 1,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: expect.stringContaining("IMDb ID tt1234567"),
            }]);
            expect(provider.findMovieIdsByImdbId).toHaveBeenCalledWith("tt1234567");
            expect(service.findByNames).not.toHaveBeenCalled();
            expect(provider.search).not.toHaveBeenCalled();
            expect(ingestion.storeFromExternal).not.toHaveBeenCalled();
            expect(service.bulkInsertUserMedia).not.toHaveBeenCalled();
        });
    }

    it("materializes completed progress using this media's own rules", async () => {
        item.payload.redo = 2;
        item.payload.playtime = 90;
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            item.payload.seasons = [{ season: 1, redo: 2, rating: 8 }];
        }

        await processItem();

        let expected: object;
        switch (mediaType) {
            case MediaType.BOOKS: expected = { redo: 2, actualPage: 100, total: 300 }; break;
            case MediaType.MANGA: expected = { redo: 2, currentChapter: 100, total: 300 }; break;
            case MediaType.MOVIES: expected = { redo: 2, total: 3 }; break;
            case MediaType.GAMES: expected = { playtime: 90 }; break;
            default: expected = { redo: 2, total: 30, currentSeason: 1, currentEpisode: 10, rating: 8 };
        }
        expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining(expected)]);
    });

    it("rejects invalid payloads before inserting any entries", async () => {
        item.payload.status = "Invalid status";
        await expect(processItem()).rejects.toThrow();
        expect(service.bulkInsertUserMedia).not.toHaveBeenCalled();
    });

    if (mediaType === MediaType.BOOKS || mediaType === MediaType.MANGA) {
        it("preserves explicit progress and totals instead of replacing them with completion defaults", async () => {
            item.payload.total = 240;
            item.payload.actualPage = null;
            item.payload.currentChapter = 40;

            await processItem();

            expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining({
                total: 240,
                ...(mediaType === MediaType.BOOKS ? { actualPage: null } : { currentChapter: 40 }),
            })]);
        });
    }

    if (mediaType === MediaType.MANGA) {
        it("uses supplied chapter progress for completed manga with an unknown length", async () => {
            service.findById.mockReturnValue({ chapters: null });
            item.payload.currentChapter = 40;
            item.payload.redo = 2;

            await processItem();

            expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining({ currentChapter: 40, total: 120 })]);
        });
    }
});


describe("import list batch writes", () => {
    const matches = [1, 2].map(id => ({ item: { id } as ImportItemsSelect, mediaId: id * 10 }));

    it("does not insert an empty batch", async () => {
        const insertRows = vi.fn();
        const writer = createImportListWriter({ toRow: (_userId, match) => match.mediaId, insertRows });
        expect(await writer.addMatchedItems(42, [])).toEqual([]);
        expect(insertRows).not.toHaveBeenCalled();
    });

    it("validates the whole batch before writing any rows", async () => {
        const insertRows = vi.fn();
        const writer = createImportListWriter({
            insertRows,
            toRow: (_userId, match) => {
                if (match.item.id === 2) throw new Error("Invalid row");
                return match.mediaId;
            },
        });

        await expect(writer.addMatchedItems(42, matches)).rejects.toThrow("Invalid row");
        expect(insertRows).not.toHaveBeenCalled();
    });

    it("reports completion only after the batch has been persisted", async () => {
        let persist!: () => void;
        const insertRows = vi.fn(() => new Promise<void>(resolve => { persist = resolve; }));
        const writer = createImportListWriter({
            insertRows,
            toRow: (userId, { mediaId }) => ({ userId, mediaId }),
        });
        let completed = false;
        const result = writer.addMatchedItems(42, matches).then(outcomes => { completed = true; return outcomes; });

        await Promise.resolve();
        expect(completed).toBe(false);
        expect(insertRows).toHaveBeenCalledWith([{ userId: 42, mediaId: 10 }, { userId: 42, mediaId: 20 }]);
        persist();
        expect(await result).toEqual(matches.map(({ item, mediaId }) => ({
            itemId: item.id, matchedMediaId: mediaId, status: ImportItemStatus.COMPLETED,
        })));
    });

    it("propagates insertion failures without reporting successful outcomes", async () => {
        const error = new Error("Insert failed");
        const writer = createImportListWriter({
            toRow: (_userId, match) => match.mediaId,
            insertRows: vi.fn().mockRejectedValue(error),
        });

        await expect(writer.addMatchedItems(42, matches)).rejects.toBe(error);
    });
});
