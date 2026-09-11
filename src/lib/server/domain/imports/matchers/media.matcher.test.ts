import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, ImportItemsSelect} from "@/lib/types/imports.types";
import {MediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
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

    it("uses an existing external ID match without searching by title", async () => {
        service.findByApiIds.mockResolvedValue([{ id: 200, apiId: "200" }]);

        expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: 200, status: ImportItemStatus.COMPLETED }]);
        expect(service.findByNames).not.toHaveBeenCalled();
        expect(provider.search).not.toHaveBeenCalled();
        expect(ingestion.storeFromExternal).not.toHaveBeenCalled();
        expect(ingestion.storeBatchFromExternal).not.toHaveBeenCalled();
    });

    it(mediaType === MediaType.BOOKS ? "preserves book title/date fallback with an external ID" : "fetches the supplied ID before accepting a different local title/date match", async () => {
        const expectedMediaId = mediaType === MediaType.BOOKS ? 100 : 200;

        expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: expectedMediaId, status: ImportItemStatus.COMPLETED }]);
        expect(service.bulkInsertUserMedia).toHaveBeenCalledWith([expect.objectContaining({ userId: 42, mediaId: expectedMediaId })]);
        expect(provider.search).not.toHaveBeenCalled();
        if (mediaType === MediaType.BOOKS) {
            expect(ingestion.storeFromExternal).not.toHaveBeenCalled();
        }
        else {
            expect(service.findByNames).not.toHaveBeenCalled();
            if (mediaType === MediaType.GAMES) expect(ingestion.storeBatchFromExternal).toHaveBeenCalledWith(["200"], false);
            else expect(ingestion.storeFromExternal).toHaveBeenCalledWith("200", false);
        }
    });

    it.each([null, ApiProviderType.USERS])("retains local name/date matching without a supported provider ID (%s)", async (source) => {
        item.externalApiSource = source;

        expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: 100, status: ImportItemStatus.COMPLETED }]);
        expect(provider.search).not.toHaveBeenCalled();
    });

    if (mediaType === MediaType.GAMES || mediaType === MediaType.BOOKS) return;

    it.each([null, "2024"])("skips a different title returned by search (date: %s)", async (releaseDate) => {
        item.externalApiId = null;
        item.releaseDate = releaseDate;
        service.findByNames.mockResolvedValue([]);
        provider.search.mockResolvedValue({ data: [{ id: 300, itemType: mediaType, name: "Requested Title: The Sequel", date: "2024-01-01", image: "" }] });

        expect(await processItem()).toEqual([expect.objectContaining({ itemId: 1, status: ImportItemStatus.SKIPPED })]);
        expect(ingestion.storeFromExternal).not.toHaveBeenCalled();
        expect(service.bulkInsertUserMedia).not.toHaveBeenCalled();
    });

    it("selects the matching title, media type, and year from mixed search results", async () => {
        item.externalApiId = null;
        service.findByNames.mockResolvedValue([]);
        provider.search.mockResolvedValue({ data: [
            { id: 300, itemType: mediaType, name: "Requested Title: The Sequel", date: "2024-01-01", image: "" },
            { id: 301, itemType: mediaType, name: " requested title ", date: "2024-02-01", image: "" },
            { id: 302, itemType: mediaType, name: "Requested Title", date: "2023-01-01", image: "" },
            { id: 303, itemType: MediaType.BOOKS, name: "Requested Title", date: "2024-01-01", image: "" },
        ] });

        expect(await processItem()).toEqual([{ itemId: 1, matchedMediaId: 200, status: ImportItemStatus.COMPLETED }]);
        expect(ingestion.storeFromExternal).toHaveBeenCalledWith(301, false);
    });
});
