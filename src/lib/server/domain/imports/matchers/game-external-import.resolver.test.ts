import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {IgdbGameExternalImportResolver} from "@/lib/server/domain/imports/matchers/game-external-import.resolver";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";


describe("IgdbGameExternalImportResolver", () => {
    it("resolves IGDB external ids in provider batches", async () => {
        const firstItem = createItem(1, {
            externalApiId: "123",
            externalApiSource: ApiProviderType.IGDB,
        });
        const secondItem = createItem(2, {
            externalApiId: "456",
            externalApiSource: ApiProviderType.IGDB,
        });
        const gamesProviderService = {
            resolveExternalMediaBatch: vi.fn().mockResolvedValue(new Map([
                ["123", 101],
                ["456", 202],
            ])),
        };
        const resolver = new IgdbGameExternalImportResolver(gamesProviderService as any);

        const [result] = await collect(resolver.resolve([firstItem, secondItem]));

        expect(gamesProviderService.resolveExternalMediaBatch).toHaveBeenCalledWith(["123", "456"]);
        expect(result).toEqual({
            failed: [],
            skipped: [],
            unresolved: [],
            matched: [
                { item: firstItem, mediaId: 101 },
                { item: secondItem, mediaId: 202 },
            ],
        });
    });

    it("leaves game rows without IGDB ids unresolved", async () => {
        const item = createItem(1, {
            externalApiId: null,
            externalApiSource: null,
        });
        const resolver = new IgdbGameExternalImportResolver({} as any);

        const [result] = await collect(resolver.resolve([item]));

        expect(result).toEqual({
            failed: [],
            skipped: [],
            matched: [],
            unresolved: [item],
        });
    });
});


const createItem = (id: number, overrides: Partial<ImportItemsSelect> = {}): ImportItemsSelect => ({
    id,
    jobId: 10,
    rowNumber: id + 1,
    name: `Game ${id}`,
    releaseDate: "2024",
    statusReason: null,
    externalApiId: null,
    matchedMediaId: null,
    externalApiSource: null,
    mediaType: MediaType.GAMES,
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    status: ImportItemStatus.PROCESSING,
    payload: { status: Status.PLAYING },
    ...overrides,
});


const collect = async <T>(iterable: AsyncIterable<T>) => {
    const values: T[] = [];
    for await (const value of iterable) {
        values.push(value);
    }
    return values;
};
