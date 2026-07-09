import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ExternalTMDBTvMatcher} from "@/lib/server/domain/imports/matchers/external-tv.matcher";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";


describe("ExternalTMDBTvMatcher", () => {
    it("resolves a TV row with a TMDB id", async () => {
        const item = createItem(1, {
            externalApiId: "136315",
            externalApiSource: ApiProviderType.TMDB,
        });
        const tvProviderService = {
            fetchAndStoreMediaDetails: vi.fn().mockResolvedValue(100),
        };
        const matcher = new ExternalTMDBTvMatcher(MediaType.SERIES, tvProviderService as any);

        const [result] = await collect(matcher.match([item]));

        expect(tvProviderService.fetchAndStoreMediaDetails).toHaveBeenCalledWith("136315");
        expect(result).toEqual({
            failed: [],
            skipped: [],
            unresolved: [],
            matched: [{ item, mediaId: 100 }],
        });
    });

    it("uses the configured TV media type when filtering search results", async () => {
        const item = createItem(1, {
            externalApiId: null,
            externalApiSource: null,
            name: "Frieren",
            releaseDate: "2023",
        });
        const tvProviderService = {
            fetchAndStoreMediaDetails: vi.fn().mockResolvedValue(200),
            search: vi.fn().mockResolvedValue({
                hasNextPage: false,
                data: [
                    { id: 1, name: "Frieren", date: "2023-09-29", itemType: MediaType.SERIES, image: "" },
                    { id: 2, name: "Frieren", date: "2023-09-29", itemType: MediaType.ANIME, image: "" },
                ],
            }),
        };
        const matcher = new ExternalTMDBTvMatcher(MediaType.ANIME, tvProviderService as any);

        const [result] = await collect(matcher.match([item]));

        expect(tvProviderService.fetchAndStoreMediaDetails).toHaveBeenCalledWith(2);
        expect(result.matched).toEqual([{ item, mediaId: 200 }]);
    });
});


const createItem = (id: number, overrides: Partial<ImportItemsSelect> = {}): ImportItemsSelect => ({
    id,
    jobId: 10,
    rowNumber: id + 1,
    name: `TV ${id}`,
    releaseDate: "2024",
    statusReason: null,
    externalApiId: null,
    matchedMediaId: null,
    externalApiSource: null,
    mediaType: MediaType.SERIES,
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    status: ImportItemStatus.PROCESSING,
    payload: { status: Status.WATCHING },
    ...overrides,
});


const collect = async <T>(iterable: AsyncIterable<T>) => {
    const values: T[] = [];
    for await (const value of iterable) {
        values.push(value);
    }
    return values;
};
