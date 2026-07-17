import {MediaType, Status} from "@/lib/utils/enums";
import {LibraryStatsRebuildRepository} from "@/lib/server/domain/media/shared/library/library-stats-rebuild.repository";
import {LibraryStatsAggregate, LibraryStatsContribution, LibraryStatsContributionQuery} from "@/lib/server/domain/media/shared/library/library-stats-rebuild.types";


/** Generic aggregation engine; each media module supplies its own contribution policy. */
export class LibraryStatsRebuildCommand {
    constructor(
        private readonly kind: MediaType,
        private readonly contributions: LibraryStatsContributionQuery,
        private readonly repository = new LibraryStatsRebuildRepository(),
    ) {
    }

    async rebuild() {
        const rows = await this.contributions.getContributions();
        const byUser = new Map<number, LibraryStatsContribution[]>();

        for (const row of rows) {
            const entries = byUser.get(row.userId) ?? [];
            entries.push(row);
            byUser.set(row.userId, entries);
        }

        const aggregates: LibraryStatsAggregate[] = [...byUser.entries()].map(([userId, entries]) => {
            const ratings = entries.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
            const statusCounts = entries.reduce((counts, entry) => {
                counts[entry.status] = (counts[entry.status] ?? 0) + 1;
                return counts;
            }, {} as Partial<Record<Status, number>>);
            const ratingSum = ratings.reduce((sum, rating) => sum + rating, 0);

            return {
                userId,
                statusCounts,
                ratingSum,
                totalEntries: entries.length,
                entriesRated: ratings.length,
                averageRating: ratings.length > 0 ? ratingSum / ratings.length : null,
                timeSpentMinutes: Math.round(entries.reduce((sum, entry) => sum + entry.timeSpent, 0)),
                totalRedo: entries.reduce((sum, entry) => sum + entry.redo, 0),
                totalSpecific: entries.reduce((sum, entry) => sum + entry.specific, 0),
                entriesCommented: entries.filter(({ comment }) => !!comment).length,
                entriesFavorited: entries.filter(({ favorite }) => favorite).length,
            };
        });

        await this.repository.replace(this.kind, aggregates);
        return byUser.size;
    }
}
