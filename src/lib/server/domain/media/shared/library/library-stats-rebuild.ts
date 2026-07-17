import {eq, sql} from "drizzle-orm";
import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryEntry, libraryStats} from "@/lib/server/database/schema";


export type GetLibraryStatsContributions = (...args: any) => Promise<LibraryStatsContribution[]>;

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


interface CreateLibraryStatsRebuildOptions {
    kind: MediaType;
    getContributions: GetLibraryStatsContributions;
}


/** Generic aggregation engine; each media module supplies its own contribution policy. */
export const createLibraryStatsRebuild = ({ kind, getContributions }: CreateLibraryStatsRebuildOptions) => {
    return async () => {
        const mediaContributions = await getContributions();
        const aggregates = aggregateLibraryStats(mediaContributions);
        await replaceLibraryStats(kind, aggregates);

        return aggregates.length;
    };
};


export const aggregateLibraryStats = (rows: LibraryStatsContribution[]): LibraryStatsAggregate[] => {
    const byUser = new Map<number, LibraryStatsContribution[]>();

    for (const row of rows) {
        const entries = byUser.get(row.userId) ?? [];
        entries.push(row);
        byUser.set(row.userId, entries);
    }

    return [...byUser.entries()].map(([userId, entries]) => {
        const ratings = entries.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);

        const statusCounts = entries.reduce((counts, entry) => {
            counts[entry.status] = (counts[entry.status] ?? 0) + 1;
            return counts;
        }, {} as Partial<Record<Status, number>>);

        const ratingSum = ratings.reduce((sum, rating) => sum + rating, 0);

        return {
            userId,
            ratingSum,
            statusCounts,
            totalEntries: entries.length,
            entriesRated: ratings.length,
            averageRating: ratings.length > 0 ? ratingSum / ratings.length : null,
            entriesCommented: entries.filter(({ comment }) => !!comment).length,
            entriesFavorited: entries.filter(({ favorite }) => favorite).length,
            totalRedo: entries.reduce((sum, entry) => sum + entry.redo, 0),
            totalSpecific: entries.reduce((sum, entry) => sum + entry.specific, 0),
            timeSpentMinutes: Math.round(entries.reduce((sum, entry) => sum + entry.timeSpent, 0)),
        };
    });
};

export const libraryStatsContributionBase = {
    userId: libraryEntry.userId,
    status: libraryEntry.status,
    rating: libraryEntry.rating,
    comment: libraryEntry.comment,
    favorite: libraryEntry.favorite,
};

const replaceLibraryStats = async (kind: MediaType, aggregates: LibraryStatsAggregate[]) => {
    await getDbClient()
        .delete(libraryStats)
        .where(eq(libraryStats.kind, kind));

    if (aggregates.length === 0) return;

    await getDbClient()
        .insert(libraryStats)
        .values(aggregates.map((aggregate) => ({
            ...aggregate,
            kind,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })));
};
