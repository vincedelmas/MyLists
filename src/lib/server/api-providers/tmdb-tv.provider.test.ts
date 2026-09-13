import {describe, expect, it, vi} from "vitest";
import type {MalApi} from "@/lib/server/api-providers/api";
import type {TvRepository} from "@/lib/server/domain/media/tv";
import type {UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {createAnimeIngestionService} from "./tmdb-tv.provider";


vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: (action: () => unknown) => action(),
}));


describe("anime genre enrichment", () => {
    it("keeps TMDB genres for bulk stores, preserves stored genres on bulk refresh, and enriches manual additions", async () => {
        const details = {
            mediaData: { apiId: 123, name: "Frieren" },
            genresData: [{ name: "Animation" }],
        } as UpsertTvWithDetails;
        const mal = { searchAnimeGenres: vi.fn().mockResolvedValue({ data: [] }) };
        const repository = {
            storeMediaWithDetails: vi.fn().mockReturnValue(42),
            updateMediaWithDetails: vi.fn().mockReturnValue(true),
        };
        const ingestion = createAnimeIngestionService(mal as unknown as MalApi, repository as unknown as TvRepository, {
            search: vi.fn(),
            getDetails: vi.fn().mockResolvedValue(details),
        });

        await expect(ingestion.storeFromExternal(123, false, true)).resolves.toBe(42);
        expect(mal.searchAnimeGenres).not.toHaveBeenCalled();
        expect(repository.storeMediaWithDetails).toHaveBeenLastCalledWith(details);

        await ingestion.refreshFromExternal(123, true);
        expect(mal.searchAnimeGenres).not.toHaveBeenCalled();
        expect(repository.updateMediaWithDetails).toHaveBeenCalledWith({ mediaData: details.mediaData });
        expect(details.genresData).toEqual([{ name: "Animation" }]);

        await ingestion.storeFromExternal(123, false);
        expect(mal.searchAnimeGenres).toHaveBeenCalledWith("Frieren");
    });
});
