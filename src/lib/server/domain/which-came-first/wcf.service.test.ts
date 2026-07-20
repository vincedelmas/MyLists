import {describe, expect, it, vi} from "vitest";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";


vi.mock("@/lib/schemas/wcf.schema", () => ({
    WCF_MAX_ROUNDS: 30,
    WCF_MEDIA_TYPES: ["series", "anime", "movies", "games", "manga"],
}));


describe("WcfService.getGameData", () => {
    it("returns a user-facing error when there is not enough media to create a game", async () => {
        const repository = {
            countPool: vi.fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]),
            syncCuratedPool: vi.fn().mockResolvedValue(undefined),
            getStats: vi.fn(),
        } as unknown as typeof WcfRepository;
        const mediaService = {
            getPopularMediaRefs: vi.fn().mockResolvedValue([]),
        };
        const mediaServiceRegistry = {
            get: vi.fn().mockReturnValue(mediaService),
        } as unknown as typeof MediaServiceRegistry;
        const service = new WcfService(repository, mediaServiceRegistry);

        await expect(service.getGameData(42)).rejects.toMatchObject({
            name: "FormattedError",
            message: "Not enough media found to create a Which Came First game.",
        });

        expect(mediaServiceRegistry.get).toHaveBeenCalledTimes(5);
        expect(repository.syncCuratedPool).toHaveBeenCalledTimes(5);
        expect(repository.getStats).not.toHaveBeenCalled();
    });
});
