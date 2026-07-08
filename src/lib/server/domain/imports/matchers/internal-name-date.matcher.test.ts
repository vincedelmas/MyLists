import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {InternalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";


describe("InternalNameDateMatcher", () => {
    it("matches exact normalized names using flexible release-date precision", async () => {
        const mediaService = {
            findByNames: vi.fn().mockResolvedValue([
                { id: 100, name: "Dune", releaseDate: "2021-10-22" },
                { id: 101, name: "Dune", releaseDate: "1984-12-14" },
            ]),
        };
        const matcher = new InternalNameDateMatcher(mediaService as any);
        const yearItem = createItem(1, { name: " dune ", releaseDate: "2021" });
        const monthItem = createItem(2, { name: "DUNE", releaseDate: "1984-12" });

        const result = await matcher.match([yearItem, monthItem]);

        expect(mediaService.findByNames).toHaveBeenCalledWith(["dune"]);
        expect(result).toEqual({
            matched: [
                { item: yearItem, mediaId: 100 },
                { item: monthItem, mediaId: 101 },
            ],
            unresolved: [],
        });
    });

    it("leaves ambiguous, missing, and unmatched candidates unresolved", async () => {
        const mediaService = {
            findByNames: vi.fn().mockResolvedValue([
                { id: 100, name: "Shared", releaseDate: "2020-01-01" },
                { id: 101, name: "Shared", releaseDate: "2020-06-01" },
            ]),
        };
        const matcher = new InternalNameDateMatcher(mediaService as any);
        const ambiguousItem = createItem(1, { name: "Shared", releaseDate: "2020" });
        const noDateItem = createItem(2, { name: "No Date", releaseDate: null });
        const unknownItem = createItem(3, { name: "Unknown", releaseDate: "2024" });

        const result = await matcher.match([ambiguousItem, noDateItem, unknownItem]);

        expect(result.matched).toEqual([]);
        expect(result.unresolved).toEqual([ambiguousItem, noDateItem, unknownItem]);
    });

    it("does not query the database without a usable name and date", async () => {
        const mediaService = {
            findByNames: vi.fn().mockResolvedValue([]),
        };
        const matcher = new InternalNameDateMatcher(mediaService as any);
        const item = createItem(1, { name: null, releaseDate: null });

        await expect(matcher.match([item])).resolves.toEqual({
            matched: [],
            unresolved: [item],
        });
        expect(mediaService.findByNames).not.toHaveBeenCalled();
    });
});


const createItem = (id: number, overrides: Partial<ImportItemsSelect> = {}): ImportItemsSelect => ({
    id,
    jobId: 1,
    rowNumber: id + 1,
    name: `Item ${id}`,
    releaseDate: "2024",
    statusReason: null,
    externalApiId: null,
    matchedMediaId: null,
    externalApiSource: null,
    mediaType: MediaType.MOVIES,
    payload: { status: "Completed" },
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    status: ImportItemStatus.PROCESSING,
    ...overrides,
});
