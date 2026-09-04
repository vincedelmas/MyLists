import {describe, expect, it, vi} from "vitest";
import {createWcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import type {WcfCatalogRegistry} from "@/lib/server/domain/which-came-first/wcf-catalog";
import type {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";


vi.mock("@/lib/schemas/wcf.schema", () => ({
    WCF_MAX_ROUNDS: 30,
}));


describe("createWcfService.getGameData", () => {
    it("returns a user-facing error when there is not enough media to create a game", async () => {
        const repository = {
            countPool: vi.fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]),
            syncCuratedPool: vi.fn().mockResolvedValue(undefined),
            getStats: vi.fn(),
        } as unknown as WcfRepository;
        const getPopularMediaRefs = vi.fn().mockResolvedValue([]);
        const catalogRegistry = {
            catalogs: ["series", "anime", "movies", "games", "manga"].map((mediaType) => ({
                mediaType,
                getPopularMediaRefs,
            })),
        } as unknown as WcfCatalogRegistry;
        const service = createWcfService(repository, catalogRegistry);

        await expect(service.getGameData(42)).rejects.toMatchObject({
            name: "FormattedError",
            message: "Not enough media found to create a Which Came First game.",
        });

        expect(getPopularMediaRefs).toHaveBeenCalledTimes(5);
        expect(repository.syncCuratedPool).toHaveBeenCalledTimes(5);
        expect(repository.getStats).not.toHaveBeenCalled();
    });
});
