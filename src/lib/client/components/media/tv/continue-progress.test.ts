import {describe, expect, it} from "vitest";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import type {ContinueItemFor} from "@/lib/client/components/continue/continue.types";
import {getTvContinueProgress} from "./continue-progress";


describe("TV continue progress", () => {
    const series = {
        mediaType: MediaType.SERIES,
        currentSeason: 1,
        currentEpisode: 2,
        total: 12,
        epsPerSeason: [{ season: 3, episodes: 3 }, { season: 1, episodes: 2 }],
    } as ContinueItemFor<typeof MediaType.SERIES>;

    it("shows progress across sparse seasons without counting rewatches", () => {
        expect(getTvContinueProgress(series)).toMatchObject({
            value: 2,
            total: 5,
            label: "S1/S3 · Eps. 2/2",
            update: { payload: { type: UpdateType.TV, currentSeason: 3, currentEpisode: 1 } },
        });
    });

    it("shows the final known episode as full progress", () => {
        expect(getTvContinueProgress({ ...series, currentSeason: 3, currentEpisode: 3 })).toMatchObject({
            value: 5,
            total: 5,
            label: "S3/S3 · Eps. 3/3",
            actionLabel: "Mark completed",
            update: { payload: { type: UpdateType.STATUS, status: Status.COMPLETED } },
        });
    });

    it("increments within the current season before advancing to another one", () => {
        expect(getTvContinueProgress({ ...series, currentEpisode: 1 }).update).toEqual({
            payload: { type: UpdateType.TV, currentEpisode: 2 },
        });
    });
});
