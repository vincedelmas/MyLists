import {Status} from "@/lib/utils/enums";


export type LibraryStatsContribution = {
    redo: number;
    userId: number;
    status: Status;
    specific: number;
    favorite: boolean;
    timeSpent: number;
    rating: number | null;
    comment: string | null;
};


export interface LibraryStatsContributionQuery {
    getContributions(): Promise<LibraryStatsContribution[]>;
}


export type LibraryStatsAggregate = {
    userId: number;
    ratingSum: number;
    totalRedo: number;
    totalEntries: number;
    entriesRated: number;
    totalSpecific: number;
    timeSpentMinutes: number;
    entriesCommented: number;
    entriesFavorited: number;
    averageRating: number | null;
    statusCounts: Partial<Record<Status, number>>;
};
