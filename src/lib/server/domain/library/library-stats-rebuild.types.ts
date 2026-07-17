import {Status} from "@/lib/utils/enums";


export type LibraryStatsContribution = {
    userId: number;
    status: Status;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    timeSpent: number;
    redo: number;
    specific: number;
};


export interface LibraryStatsContributionQuery {
    getContributions(): Promise<LibraryStatsContribution[]>;
}


export type LibraryStatsAggregate = {
    userId: number;
    statusCounts: Partial<Record<Status, number>>;
    ratingSum: number;
    totalEntries: number;
    entriesRated: number;
    averageRating: number | null;
    timeSpentMinutes: number;
    totalRedo: number;
    totalSpecific: number;
    entriesCommented: number;
    entriesFavorited: number;
};
