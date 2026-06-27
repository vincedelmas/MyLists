import {describe, expect, it} from "vitest";
import {calculateTasteSimilarity, emptyRatingAggregate, mergeRatingAggregates} from "@/lib/utils/taste-similarity";


describe("calculateTasteSimilarity", () => {
    it("returns a perfect raw match for identical rating patterns", () => {
        const aggregate = {
            count: 3,
            sumMine: 15,
            sumTheirs: 15,
            sumProduct: 89,
            sumMineSquared: 89,
            sumTheirsSquared: 89,
            sumAbsoluteDifference: 0,
        };

        expect(calculateTasteSimilarity(aggregate, false)).toBe(100);
        expect(calculateTasteSimilarity(aggregate)).toBeLessThan(100);
    });

    it("uses absolute agreement when one user's ratings have no variance", () => {
        const aggregate = {
            count: 2,
            sumMine: 16,
            sumTheirs: 15,
            sumProduct: 120,
            sumMineSquared: 128,
            sumTheirsSquared: 113,
            sumAbsoluteDifference: 1,
        };

        expect(calculateTasteSimilarity(aggregate, false)).toBe(95);
    });

    it("does not use unstable correlation for fewer than five shared ratings", () => {
        const aggregate = {
            count: 3,
            sumMine: 15,
            sumTheirs: 15,
            sumProduct: 50,
            sumMineSquared: 125,
            sumTheirsSquared: 125,
            sumAbsoluteDifference: 20,
        };

        expect(calculateTasteSimilarity(aggregate, false)).toBe(33);
    });

    it("merges per-media aggregates into an overall aggregate", () => {
        const overall = emptyRatingAggregate();
        mergeRatingAggregates(overall, {
            count: 2,
            sumMine: 15,
            sumTheirs: 14,
            sumProduct: 106,
            sumMineSquared: 113,
            sumTheirsSquared: 100,
            sumAbsoluteDifference: 1,
        });

        expect(overall).toMatchObject({ count: 2, sumMine: 15, sumTheirs: 14 });
    });
});
