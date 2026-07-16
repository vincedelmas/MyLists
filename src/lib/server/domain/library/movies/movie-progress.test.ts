import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {
    changeMovieStatus,
    createInitialMovieProgress,
    importMovieProgress,
    movieRedoCount,
    replaceMovieRewatches,
} from "@/lib/server/domain/library/movies/movie-progress";


describe("movie progress", () => {
    it("uses one canonical watch count for initial watches and rewatches", () => {
        const completed = createInitialMovieProgress(Status.COMPLETED);
        expect(completed).toEqual({ status: Status.COMPLETED, watchCount: 1 });
        expect(replaceMovieRewatches(completed, 7)).toEqual({ status: Status.COMPLETED, watchCount: 8 });
        expect(movieRedoCount({ status: Status.COMPLETED, watchCount: 8 })).toBe(7);
    });

    it("resets watch count on status changes and rejects impossible planned rewatches", () => {
        const watched = importMovieProgress(Status.COMPLETED, 3);
        expect(changeMovieStatus(watched, Status.PLAN_TO_WATCH)).toEqual({ status: Status.PLAN_TO_WATCH, watchCount: 0 });
        expect(() => replaceMovieRewatches({ status: Status.PLAN_TO_WATCH, watchCount: 0 }, 1)).toThrow("planned movie");
        expect(() => createInitialMovieProgress(Status.WATCHING)).toThrow("not valid for movies");
    });

    it("normalizes stale imported total values from status and redo only", () => {
        expect(importMovieProgress(Status.COMPLETED, 7)).toEqual({ status: Status.COMPLETED, watchCount: 8 });
        expect(importMovieProgress(Status.PLAN_TO_WATCH, 7)).toEqual({ status: Status.PLAN_TO_WATCH, watchCount: 0 });
    });
});
