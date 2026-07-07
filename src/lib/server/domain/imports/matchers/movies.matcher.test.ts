import {describe, expect, it, vi} from "vitest";
import {ImportMatcherItem} from "@/lib/types/imports.types";
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
            addMatchedItems: vi.fn().mockResolvedValue([{ itemId: 1, matchedMediaId: 101, status: ImportItemStatus.COMPLETED }]),
        };
        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any);

        const outcomes = await collect(matcher.match({ jobId: 10, userId: 42 }, [matchedItem, unresolvedItem]));

        expect(internalMatcher.match).toHaveBeenCalledWith([matchedItem, unresolvedItem]);
        expect(listWriter.addMatchedItems).toHaveBeenCalledWith(42, [{ item: matchedItem, mediaId: 101 }]);
        expect(outcomes).toEqual([
            [{ itemId: 1, matchedMediaId: 101, status: ImportItemStatus.COMPLETED }],
            [{
                itemId: 2,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: "No internal movie match found",
            }],
        ]);
    });

    it("does not yield empty batches", async () => {
        const listWriter = { addMatchedItems: vi.fn().mockResolvedValue([]) };
        const internalMatcher = { match: vi.fn().mockResolvedValue({ matched: [], unresolved: [] }) };

        const matcher = new MoviesMatcher(internalMatcher as any, listWriter as any);

        await expect(collect(matcher.match({ jobId: 10, userId: 42 }, []))).resolves.toEqual([]);

        expect(internalMatcher.match).not.toHaveBeenCalled();
        expect(listWriter.addMatchedItems).not.toHaveBeenCalled();
    });
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
