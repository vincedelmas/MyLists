import {Status} from "@/lib/utils/enums";
import {describe, expect, it} from "vitest";
import {aggregateLibraryStats, LibraryStatsContribution} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";


const contributions: LibraryStatsContribution[] = [
    {
        userId: 1,
        status: Status.WATCHING,
        rating: 8,
        comment: "",
        favorite: false,
        redo: 0,
        specific: 10,
        timeSpent: 10.4,
    },
    {
        userId: 1,
        status: Status.COMPLETED,
        rating: null,
        comment: "Finished",
        favorite: true,
        redo: 2,
        specific: 5,
        timeSpent: 20.4,
    },
    {
        userId: 2,
        status: Status.COMPLETED,
        rating: 6,
        comment: null,
        favorite: false,
        redo: 1,
        specific: 3,
        timeSpent: 3.3,
    },
];


describe("library stats rebuild", () => {
    it("aggregates media-owned contributions by user", () => {
        expect(aggregateLibraryStats(contributions)).toEqual([
            {
                userId: 1,
                ratingSum: 8,
                statusCounts: {
                    [Status.WATCHING]: 1,
                    [Status.COMPLETED]: 1,
                },
                totalEntries: 2,
                entriesRated: 1,
                averageRating: 8,
                entriesCommented: 1,
                entriesFavorited: 1,
                totalRedo: 2,
                totalSpecific: 15,
                timeSpentMinutes: 31,
            },
            {
                userId: 2,
                ratingSum: 6,
                statusCounts: {
                    [Status.COMPLETED]: 1,
                },
                totalEntries: 1,
                entriesRated: 1,
                averageRating: 6,
                entriesCommented: 0,
                entriesFavorited: 0,
                totalRedo: 1,
                totalSpecific: 3,
                timeSpentMinutes: 3,
            },
        ]);
    });
});
