import {describe, expect, it, vi} from "vitest";
import {ImportMatcherItem} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/internal-media.matcher";


describe("InternalMediaMatcher", () => {
    it("matches by provider ID first and name/date only for unresolved items", async () => {
        const mediaService = {
            findByApiIds: vi.fn().mockResolvedValue([{ id: 100, apiId: 550 }]),
            findByNames: vi.fn().mockResolvedValue([{ id: 101, name: "Fallback Movie", releaseDate: "2020-05-10" }]),
        };

        const matcher = new InternalMediaMatcher(ApiProviderType.TMDB, mediaService as any);

        const idMatchedItem = createItem(1, {
            externalApiId: "550",
            name: "Already matched",
            externalApiSource: ApiProviderType.TMDB,
        });
        const nameMatchedItem = createItem(2, {
            releaseDate: "2020",
            externalApiId: "999",
            name: "Fallback Movie",
            externalApiSource: ApiProviderType.TMDB,
        });
        const unresolvedItem = createItem(3, {
            name: "Unknown",
            releaseDate: "2024",
        });

        const result = await matcher.match([idMatchedItem, nameMatchedItem, unresolvedItem]);

        expect(mediaService.findByApiIds).toHaveBeenCalledWith(["550", "999"]);
        expect(mediaService.findByNames).toHaveBeenCalledWith(["fallback movie", "unknown"]);
        expect(result).toEqual({
            matched: [
                { item: idMatchedItem, mediaId: 100 },
                { item: nameMatchedItem, mediaId: 101 },
            ],
            unresolved: [unresolvedItem],
        });
    });
});


const createItem = (id: number, overrides: Partial<ImportMatcherItem> = {}): ImportMatcherItem => ({
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
