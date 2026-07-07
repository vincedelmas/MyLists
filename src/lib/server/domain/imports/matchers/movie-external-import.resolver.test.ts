import {describe, expect, it, vi} from "vitest";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {ImportMatcherItem} from "@/lib/types/imports.types";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {TmdbMovieExternalImportResolver} from "@/lib/server/domain/imports/matchers/movie-external-import.resolver";


describe("TmdbMovieExternalImportResolver", () => {
    it("resolves a unique TMDB movie candidate into a matched import item", async () => {
        const item = createItem(1, { name: "Heat", releaseDate: "1995" });
        const moviesService = {
            resolveExternalMedia: vi.fn().mockResolvedValue(101),
        };
        const moviesProviderService = {
            search: vi.fn().mockResolvedValue({
                hasNextPage: false,
                data: [createSearchResult({ id: 949, name: "Heat", date: "1995-12-15" })],
            }),
        };
        const resolver = new TmdbMovieExternalImportResolver(moviesService as any, moviesProviderService as any);

        const [result] = await collect(resolver.resolve([item]));

        expect(moviesProviderService.search).toHaveBeenCalledWith("Heat");
        expect(moviesService.resolveExternalMedia).toHaveBeenCalledWith(949, moviesProviderService);
        expect(result).toEqual({
            skipped: [],
            unresolved: [],
            matched: [{ item, mediaId: 101 }],
        });
    });

    it("uses release date precision as a prefix filter", async () => {
        const item = createItem(1, { name: "Dune", releaseDate: "2021-09" });
        const moviesService = {
            resolveExternalMedia: vi.fn().mockResolvedValue(202),
        };
        const moviesProviderService = {
            search: vi.fn().mockResolvedValue({
                hasNextPage: false,
                data: [
                    createSearchResult({ id: 1, name: "Dune", date: "1984-12-14" }),
                    createSearchResult({ id: 2, name: "Dune", date: "2021-09-15" }),
                ],
            }),
        };
        const resolver = new TmdbMovieExternalImportResolver(moviesService as any, moviesProviderService as any);

        const [result] = await collect(resolver.resolve([item]));

        expect(moviesService.resolveExternalMedia).toHaveBeenCalledWith(2, moviesProviderService);
        expect(result.matched).toEqual([{ item, mediaId: 202 }]);
    });

    it("skips ambiguous movie candidates", async () => {
        const item = createItem(1, { name: "Crash", releaseDate: null });
        const moviesProviderService = {
            search: vi.fn().mockResolvedValue({
                hasNextPage: false,
                data: [
                    createSearchResult({ id: 1, name: "Crash", date: "1996-07-17" }),
                    createSearchResult({ id: 2, name: "Crash", date: "2005-05-06" }),
                ],
            }),
        };
        const resolver = new TmdbMovieExternalImportResolver({} as any, moviesProviderService as any);

        const [result] = await collect(resolver.resolve([item]));

        expect(result).toEqual({
            matched: [],
            unresolved: [],
            skipped: [{
                itemId: item.id,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: "Movie API match is ambiguous",
            }],
        });
    });

    it("skips missing movie candidates", async () => {
        const item = createItem(1, { name: "Missing movie", releaseDate: "2024" });
        const moviesProviderService = {
            search: vi.fn().mockResolvedValue({
                data: [],
                hasNextPage: false,
            }),
        };
        const resolver = new TmdbMovieExternalImportResolver({} as any, moviesProviderService as any);

        const [result] = await collect(resolver.resolve([item]));

        expect(result).toEqual({
            matched: [],
            unresolved: [],
            skipped: [{
                itemId: item.id,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: "Movie API match not found",
            }],
        });
    });

    it("yields resolver results in configured batches", async () => {
        const firstItem = createItem(1, { name: "Movie 1" });
        const secondItem = createItem(2, { name: "Movie 2" });
        const thirdItem = createItem(3, { name: "Movie 3" });
        const moviesService = {
            resolveExternalMedia: vi.fn()
                .mockResolvedValueOnce(101)
                .mockResolvedValueOnce(102)
                .mockResolvedValueOnce(103),
        };
        const moviesProviderService = {
            search: vi.fn()
                .mockResolvedValueOnce({ hasNextPage: false, data: [createSearchResult({ id: 1, name: "Movie 1" })] })
                .mockResolvedValueOnce({ hasNextPage: false, data: [createSearchResult({ id: 2, name: "Movie 2" })] })
                .mockResolvedValueOnce({ hasNextPage: false, data: [createSearchResult({ id: 3, name: "Movie 3" })] }),
        };
        const resolver = new TmdbMovieExternalImportResolver(moviesService as any, moviesProviderService as any, 2);

        const results = await collect(resolver.resolve([firstItem, secondItem, thirdItem]));

        expect(results).toEqual([
            {
                skipped: [],
                unresolved: [],
                matched: [
                    { item: firstItem, mediaId: 101 },
                    { item: secondItem, mediaId: 102 },
                ],
            },
            {
                skipped: [],
                unresolved: [],
                matched: [{ item: thirdItem, mediaId: 103 }],
            },
        ]);
    });
});


const createSearchResult = (overrides: Partial<ProviderSearchResult> = {}): ProviderSearchResult => ({
    id: 1,
    name: "Movie",
    image: "",
    date: "2024",
    itemType: MediaType.MOVIES,
    ...overrides,
});


const collect = async <T>(iterable: AsyncIterable<T>) => {
    const values: T[] = [];
    for await (const value of iterable) {
        values.push(value);
    }
    return values;
};


const createItem = (id: number, overrides: Partial<ImportMatcherItem> = {}): ImportMatcherItem => ({
    id,
    jobId: 10,
    rowNumber: id + 1,
    name: `Movie ${id}`,
    releaseDate: "2024",
    statusReason: null,
    externalApiId: null,
    matchedMediaId: null,
    externalApiSource: null,
    mediaType: MediaType.MOVIES,
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    status: ImportItemStatus.PROCESSING,
    payload: { status: Status.COMPLETED, total: 1, redo: 0 },
    ...overrides,
});
