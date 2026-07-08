import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {InternalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";


describe("InternalApiIdMatcher", () => {
    it("does not query IDs belonging to another provider", async () => {
        const mediaService = {
            findByApiIds: vi.fn().mockResolvedValue([]),
        };
        const matcher = new InternalApiIdMatcher(ApiProviderType.TMDB, mediaService as any);
        const item = createItem(1, {
            externalApiId: "42",
            externalApiSource: ApiProviderType.IGDB,
        });

        const result = await matcher.match([item]);

        expect(mediaService.findByApiIds).not.toHaveBeenCalled();
        expect(result.unresolved).toEqual([item]);
    });
});


const createItem = (id: number, overrides: Partial<ImportItemsSelect> = {}) => ({
    id,
    jobId: 1,
    rowNumber: id + 1,
    name: `Item ${id}`,
    statusReason: null,
    releaseDate: "2024",
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
