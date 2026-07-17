import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {
    changeTvStatus,
    consumedEpisodeCount,
    createInitialTvProgress,
    moveTvProgress,
    moveTvProgressToSeason,
    positionFromWatchedEpisodes,
    reconcileTvSeasons,
    replaceTvRewatches,
    TvSeasonDefinition,
} from "./tv-progress";


const seasons: TvSeasonDefinition[] = [
    { seasonNumber: 1, episodeCount: 12 },
    { seasonNumber: 2, episodeCount: 8 },
    { seasonNumber: 3, episodeCount: 10 },
];


describe("TV progress model", () => {
    it("creates status-specific initial progress", () => {
        expect(createInitialTvProgress(Status.WATCHING, seasons)).toMatchObject({
            currentSeason: 1,
            currentEpisode: 1,
            watchedEpisodes: 1,
        });
        expect(createInitialTvProgress(Status.PLAN_TO_WATCH, seasons)).toMatchObject({
            currentSeason: 1,
            currentEpisode: 0,
            watchedEpisodes: 0,
        });
        expect(createInitialTvProgress(Status.COMPLETED, seasons)).toMatchObject({
            currentSeason: 3,
            currentEpisode: 10,
            watchedEpisodes: 30,
        });
    });

    it("maps season/episode positions to absolute progress across season boundaries", () => {
        const initial = createInitialTvProgress(Status.WATCHING, seasons);
        expect(moveTvProgress(initial, { seasonNumber: 1, episodeNumber: 12 }, seasons)).toMatchObject({ watchedEpisodes: 12 });
        expect(moveTvProgressToSeason(initial, 2, seasons)).toMatchObject({ currentSeason: 2, currentEpisode: 1, watchedEpisodes: 13 });
        expect(moveTvProgress(initial, { seasonNumber: 3, episodeNumber: 4 }, seasons)).toMatchObject({ watchedEpisodes: 24 });
    });

    it("validates season and episode boundaries", () => {
        const initial = createInitialTvProgress(Status.WATCHING, seasons);
        expect(() => moveTvProgress(initial, { seasonNumber: 4, episodeNumber: 1 }, seasons)).toThrow("Invalid season number");
        expect(() => moveTvProgress(initial, { seasonNumber: 2, episodeNumber: 9 }, seasons)).toThrow("Invalid episode");
    });

    it("normalizes rewatches as season rows", () => {
        const initial = createInitialTvProgress(Status.COMPLETED, seasons);
        const updated = replaceTvRewatches(initial, [
            { seasonNumber: 3, count: 2 },
            { seasonNumber: 1, count: 1 },
            { seasonNumber: 2, count: 0 },
        ], seasons);

        expect(updated.rewatches).toEqual([
            { seasonNumber: 1, count: 1 },
            { seasonNumber: 3, count: 2 },
        ]);
        expect(consumedEpisodeCount(updated, seasons)).toBe(62);
    });

    it("applies completed and reset status semantics without losing valid rewatches", () => {
        const watching = replaceTvRewatches(
            moveTvProgress(createInitialTvProgress(Status.WATCHING, seasons), { seasonNumber: 2, episodeNumber: 3 }, seasons),
            [{ seasonNumber: 1, count: 1 }],
            seasons,
        );
        const completed = changeTvStatus(watching, Status.COMPLETED, seasons);
        expect(completed).toMatchObject({ currentSeason: 3, currentEpisode: 10, watchedEpisodes: 30 });
        expect(completed.rewatches).toEqual([{ seasonNumber: 1, count: 1 }]);

        const reset = changeTvStatus(completed, Status.RANDOM, seasons);
        expect(reset).toMatchObject({ currentSeason: 1, currentEpisode: 0, watchedEpisodes: 0, rewatches: [] });

        const resumed = changeTvStatus(reset, Status.WATCHING, seasons);
        expect(resumed).toMatchObject({ currentSeason: 1, currentEpisode: 1, watchedEpisodes: 1 });
    });

    it("preserves absolute progress and surviving rewatches when provider seasons change", () => {
        const current = replaceTvRewatches(
            moveTvProgress(createInitialTvProgress(Status.WATCHING, seasons), { seasonNumber: 3, episodeNumber: 4 }, seasons),
            [{ seasonNumber: 1, count: 1 }, { seasonNumber: 3, count: 2 }],
            seasons,
        );
        const changedSeasons = [
            { seasonNumber: 1, episodeCount: 10 },
            { seasonNumber: 2, episodeCount: 10 },
        ];

        expect(reconcileTvSeasons(current, changedSeasons)).toEqual({
            ...current,
            currentSeason: 2,
            currentEpisode: 10,
            watchedEpisodes: 20,
            rewatches: [{ seasonNumber: 1, count: 1 }],
        });
    });

    it("handles empty provider season data without non-null assertions", () => {
        expect(createInitialTvProgress(Status.COMPLETED, [])).toMatchObject({
            currentSeason: 1,
            currentEpisode: 0,
            watchedEpisodes: 0,
        });
        expect(positionFromWatchedEpisodes(50, [])).toEqual({ currentSeason: 1, currentEpisode: 0 });
    });
});
