import {describe, expect, it, vi} from "vitest";
import {GamesProviderService} from "@/lib/server/domain/media/games/games-provider.service";


describe("GamesProviderService", () => {
    it("fetches and stores missing IGDB game details in batches", async () => {
        const client = {
            getGamesDetails: vi.fn().mockResolvedValue([
                {
                    id: 2,
                    name: "Game 2",
                    cover: { id: 20, image_id: "cover-2" },
                },
                {
                    id: 3,
                    name: "Game 3",
                    cover: { id: 30, image_id: "cover-3" },
                },
            ]),
        };
        const repository = {
            findByApiIds: vi.fn().mockResolvedValue([{ id: 100, apiId: 1 }]),
            storeMediaWithDetails: vi.fn()
                .mockResolvedValueOnce(200)
                .mockResolvedValueOnce(300),
        };
        const service = new GamesProviderService(client as any, repository as any, {} as any);

        const result = await service.fetchAndStoreMediaDetailsBulk([1, 2, 3]);

        expect(repository.findByApiIds).toHaveBeenCalledWith([1, 2, 3]);
        expect(client.getGamesDetails).toHaveBeenCalledWith([2, 3]);
        expect(repository.storeMediaWithDetails).toHaveBeenCalledTimes(2);
        expect(result).toEqual(new Map([
            ["1", 100],
            ["2", 200],
            ["3", 300],
        ]));
    });
});
