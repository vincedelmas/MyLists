import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";


describe("MoviesMatcher", () => {
    it("adds internally matched movies and skips unresolved items", async () => {
        const matchedItem = createItem(1);
        const unresolvedItem = createItem(2);
        const internalMatcher = {
            match: vi.fn().mockResolvedValue({
                unresolved: [unresolvedItem],
                matched: [{ item: matchedItem, mediaId: 101 }],
            }),
        };
        const listWriter = {
            addMatchedItems: vi.fn()
                .mockResolvedValueOnce([{ itemId: 1, matchedMediaId: 101, status: ImportItemStatus.COMPLETED }])
                .mockResolvedValueOnce([]),
        };
        const externalResolver = {
            resolve: vi.fn().mockReturnValue(asyncResults([{ failed: [], skipped: [], matched: [], unresolved: [unresolvedItem] }])),
        };
        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any, externalResolver);

        const outcomes = await collect(matcher.match({ jobId: 10, userId: 42 }, [matchedItem, unresolvedItem]));

        expect(internalMatcher.match).toHaveBeenCalledWith([matchedItem, unresolvedItem]);
        expect(listWriter.addMatchedItems).toHaveBeenCalledWith(42, [{ item: matchedItem, mediaId: 101 }]);
        expect(externalResolver.resolve).toHaveBeenCalledWith([unresolvedItem]);
        expect(outcomes).toEqual([
            [{ itemId: 1, matchedMediaId: 101, status: ImportItemStatus.COMPLETED }],
            [{
                itemId: 2,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: "No movie match found",
            }],
        ]);
    });

    it("adds externally resolved movies before skipping remaining unresolved items", async () => {
        const externalMatchedItem = createItem(1);
        const unresolvedItem = createItem(2);
        const internalMatcher = {
            match: vi.fn().mockResolvedValue({ matched: [], unresolved: [externalMatchedItem, unresolvedItem] }),
        };
        const externalResolver = {
            resolve: vi.fn().mockReturnValue(asyncResults([{
                failed: [],
                skipped: [],
                matched: [{ item: externalMatchedItem, mediaId: 201 }],
                unresolved: [unresolvedItem],
            }])),
        };
        const listWriter = {
            addMatchedItems: vi.fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ itemId: 1, matchedMediaId: 201, status: ImportItemStatus.COMPLETED }]),
        };
        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any, externalResolver);

        const outcomes = await collect(matcher.match({ jobId: 10, userId: 42 }, [externalMatchedItem, unresolvedItem]));

        expect(listWriter.addMatchedItems).toHaveBeenNthCalledWith(1, 42, []);
        expect(listWriter.addMatchedItems).toHaveBeenNthCalledWith(2, 42, [{ item: externalMatchedItem, mediaId: 201 }]);
        expect(outcomes).toEqual([
            [{ itemId: 1, matchedMediaId: 201, status: ImportItemStatus.COMPLETED }],
            [{
                itemId: 2,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: "No movie match found",
            }],
        ]);
    });

    it("yields skipped outcomes returned by the external resolver", async () => {
        const skippedItem = createItem(1);
        const skippedOutcome = {
            itemId: skippedItem.id,
            matchedMediaId: null,
            status: ImportItemStatus.SKIPPED,
            statusReason: "Movie API match is ambiguous",
        } as const;
        const internalMatcher = {
            match: vi.fn().mockResolvedValue({ matched: [], unresolved: [skippedItem] }),
        };
        const externalResolver = {
            resolve: vi.fn().mockReturnValue(asyncResults([{ failed: [], matched: [], unresolved: [], skipped: [skippedOutcome] }])),
        };
        const listWriter = {
            addMatchedItems: vi.fn().mockResolvedValue([]),
        };
        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any, externalResolver);

        const outcomes = await collect(matcher.match({ jobId: 10, userId: 42 }, [skippedItem]));

        expect(outcomes).toEqual([[skippedOutcome]]);
    });

    it("yields failed outcomes returned by the external resolver", async () => {
        const failedItem = createItem(1);
        const failedOutcome = {
            itemId: failedItem.id,
            matchedMediaId: null,
            status: ImportItemStatus.FAILED,
            statusReason: "Movie API resolution failed: TMDB unavailable",
        } as const;
        const internalMatcher = {
            match: vi.fn().mockResolvedValue({ matched: [], unresolved: [failedItem] }),
        };
        const externalResolver = {
            resolve: vi.fn().mockReturnValue(asyncResults([{ failed: [failedOutcome], matched: [], unresolved: [], skipped: [] }])),
        };
        const listWriter = {
            addMatchedItems: vi.fn().mockResolvedValue([]),
        };
        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any, externalResolver);

        const outcomes = await collect(matcher.match({ jobId: 10, userId: 42 }, [failedItem]));

        expect(outcomes).toEqual([[failedOutcome]]);
    });

    it("does not yield empty batches", async () => {
        const listWriter = { addMatchedItems: vi.fn().mockResolvedValue([]) };
        const internalMatcher = { match: vi.fn().mockResolvedValue({ matched: [], unresolved: [] }) };
        const externalResolver = { resolve: vi.fn().mockReturnValue(asyncResults([])) };

        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any, externalResolver);

        await expect(collect(matcher.match({ jobId: 10, userId: 42 }, []))).resolves.toEqual([]);

        expect(internalMatcher.match).not.toHaveBeenCalled();
        expect(listWriter.addMatchedItems).not.toHaveBeenCalled();
        expect(externalResolver.resolve).not.toHaveBeenCalled();
    });
});


const collect = async <T>(iterable: AsyncIterable<T>) => {
    const values: T[] = [];
    for await (const value of iterable) {
        values.push(value);
    }
    return values;
};


async function* asyncResults<T>(values: T[]) {
    for (const value of values) {
        yield value;
    }
}


const createItem = (id: number, overrides: Partial<ImportItemsSelect> = {}): ImportItemsSelect => ({
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
