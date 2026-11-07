import {describe, expect, it, vi} from "vitest";
import {ImportItemStatus, MediaType} from "@/lib/utils/enums";
import type {ProviderSearchResult} from "@/lib/types/provider.types";
import type {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import {filterImportCandidates, matchExternalItems} from "./external-matcher";


vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn() } }));

const items = [1, 2, 3, 4].map(id => ({
    id, jobId: 10, name: `Title ${id}`, mediaType: MediaType.MOVIES, payload: {},
} as ImportItemsSelect));


describe("external import matching", () => {
    it("batches matches, skips, and item failures without losing later items", async () => {
        const resolveItem = vi.fn()
            .mockResolvedValueOnce({ mediaId: 100 })
            .mockResolvedValueOnce({ statusReason: "No match" })
            .mockRejectedValueOnce(new ProviderRequestError("Gone", { provider: "TMDB", statusCode: 410, kind: "item" }))
            .mockResolvedValueOnce({ mediaId: 400 });
        const batches: ExternalResolverResult[] = [];
        for await (const batch of matchExternalItems({ items, resolveItem, mediaLabel: "Movie", resultBatchSize: 2 })) {
            batches.push(batch);
        }

        expect(batches).toEqual([
            {
                matched: [{ item: items[0], mediaId: 100 }],
                skipped: [{ itemId: 2, matchedMediaId: null, status: ImportItemStatus.SKIPPED, statusReason: "No match" }],
                failed: [], unresolved: [],
            },
            {
                matched: [{ item: items[3], mediaId: 400 }],
                failed: [{ itemId: 3, matchedMediaId: null, status: ImportItemStatus.FAILED, statusReason: "API failed for this media" }],
                skipped: [], unresolved: [],
            },
        ]);
    });

    it.each(["quota", "rate_limit", "unavailable", "access"] as const)("flushes pending results before propagating a provider %s error", async kind => {
        const error = new ProviderRequestError("Paused", { provider: "TMDB", statusCode: 429, kind });
        const resolveItem = vi.fn().mockResolvedValueOnce({ mediaId: 100 }).mockRejectedValueOnce(error);
        const iterator = matchExternalItems({ items, resolveItem, mediaLabel: "Movie", resultBatchSize: 50 })[Symbol.asyncIterator]();

        expect(await iterator.next()).toMatchObject({ done: false, value: { matched: [{ item: items[0], mediaId: 100 }] } });
        await expect(iterator.next()).rejects.toBe(error);
        expect(resolveItem).toHaveBeenCalledTimes(2);
    });

    it("flushes a final partial batch", async () => {
        const batches: ExternalResolverResult[] = [];
        for await (const batch of matchExternalItems({
            items: items.slice(0, 1), mediaLabel: "Movie", resultBatchSize: 50,
            resolveItem: async () => ({ mediaId: 100 }),
        })) batches.push(batch);
        expect(batches).toHaveLength(1);
        expect(batches[0].matched).toHaveLength(1);
    });

    it("filters title/date candidates while allowing books to omit exact-title matching", () => {
        const candidates = [
            { id: 1, itemType: MediaType.MOVIES, name: " Title ", date: "2024-02-01" },
            { id: 2, itemType: MediaType.MOVIES, name: "Title", date: "2023-02-01" },
            { id: 3, itemType: MediaType.MOVIES, name: "Different", date: "2024-02-01" },
            { id: 4, itemType: MediaType.BOOKS, name: "Different", date: "2024-02-01" },
            { id: 5, itemType: MediaType.MOVIES, name: "Title", date: null },
        ] as ProviderSearchResult[];

        expect(filterImportCandidates(candidates, MediaType.MOVIES, "2024", "title").map(item => item.id)).toEqual([1]);
        expect(filterImportCandidates(candidates, MediaType.MOVIES, null, "title").map(item => item.id)).toEqual([1, 2, 5]);
        expect(filterImportCandidates(candidates, MediaType.BOOKS, "2024").map(item => item.id)).toEqual([4]);
    });
});
