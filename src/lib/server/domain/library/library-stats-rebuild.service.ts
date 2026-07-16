import {eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    bookProgress,
    catalogItem,
    gameProgress,
    libraryEntry,
    libraryStats,
    mangaProgress,
    movieDetails,
    movieProgress,
    tvDetails,
    tvProgress,
} from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";


/** Rebuilds canonical per-user aggregates from library entries and concrete progress tables. */
export class LibraryStatsRebuildService {
    async rebuild(mediaType: MediaType) {
        const rows = await getDbClient().select({
            userId: libraryEntry.userId,
            status: libraryEntry.status,
            favorite: libraryEntry.favorite,
            comment: libraryEntry.comment,
            rating: libraryEntry.rating,
            timeSpent: sql<number>`CASE ${catalogItem.kind}
                WHEN 'series' THEN (
                    ${tvProgress.watchedEpisodes} + COALESCE((
                        SELECT SUM(rewatch.count * season.episode_count)
                        FROM tv_season_rewatch rewatch
                        INNER JOIN tv_season season
                            ON season.catalog_item_id = rewatch.catalog_item_id
                            AND season.season_number = rewatch.season_number
                        WHERE rewatch.library_entry_id = ${libraryEntry.id}
                    ), 0)
                ) * ${tvDetails.episodeDurationMinutes}
                WHEN 'anime' THEN (
                    ${tvProgress.watchedEpisodes} + COALESCE((
                        SELECT SUM(rewatch.count * season.episode_count)
                        FROM tv_season_rewatch rewatch
                        INNER JOIN tv_season season
                            ON season.catalog_item_id = rewatch.catalog_item_id
                            AND season.season_number = rewatch.season_number
                        WHERE rewatch.library_entry_id = ${libraryEntry.id}
                    ), 0)
                ) * ${tvDetails.episodeDurationMinutes}
                WHEN 'movies' THEN ${movieProgress.watchCount} * ${movieDetails.durationMinutes}
                WHEN 'games' THEN ${gameProgress.playtimeMinutes}
                WHEN 'books' THEN ${bookProgress.totalPagesRead} * 1.7
                WHEN 'manga' THEN ${mangaProgress.totalChaptersRead} * 7
                ELSE 0 END`,
            redo: sql<number>`CASE ${catalogItem.kind}
                WHEN 'series' THEN COALESCE((SELECT SUM(count) FROM tv_season_rewatch WHERE library_entry_id = ${libraryEntry.id}), 0)
                WHEN 'anime' THEN COALESCE((SELECT SUM(count) FROM tv_season_rewatch WHERE library_entry_id = ${libraryEntry.id}), 0)
                WHEN 'movies' THEN MAX(${movieProgress.watchCount} - 1, 0)
                WHEN 'books' THEN ${bookProgress.rereadCount}
                WHEN 'manga' THEN ${mangaProgress.rereadCount}
                ELSE 0 END`,
            specific: sql<number>`CASE ${catalogItem.kind}
                WHEN 'series' THEN ${tvProgress.watchedEpisodes} + COALESCE((
                    SELECT SUM(rewatch.count * season.episode_count)
                    FROM tv_season_rewatch rewatch
                    INNER JOIN tv_season season
                        ON season.catalog_item_id = rewatch.catalog_item_id
                        AND season.season_number = rewatch.season_number
                    WHERE rewatch.library_entry_id = ${libraryEntry.id}
                ), 0)
                WHEN 'anime' THEN ${tvProgress.watchedEpisodes} + COALESCE((
                    SELECT SUM(rewatch.count * season.episode_count)
                    FROM tv_season_rewatch rewatch
                    INNER JOIN tv_season season
                        ON season.catalog_item_id = rewatch.catalog_item_id
                        AND season.season_number = rewatch.season_number
                    WHERE rewatch.library_entry_id = ${libraryEntry.id}
                ), 0)
                WHEN 'movies' THEN ${movieProgress.watchCount}
                WHEN 'books' THEN ${bookProgress.totalPagesRead}
                WHEN 'manga' THEN ${mangaProgress.totalChaptersRead}
                ELSE 0 END`,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .leftJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .leftJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, mediaType));

        const byUser = new Map<number, typeof rows>();
        for (const row of rows) {
            const entries = byUser.get(row.userId) ?? [];
            entries.push(row);
            byUser.set(row.userId, entries);
        }

        await getDbClient().delete(libraryStats).where(eq(libraryStats.kind, mediaType));
        if (byUser.size === 0) return 0;

        await getDbClient().insert(libraryStats).values([...byUser.entries()].map(([userId, entries]) => {
            const ratings = entries.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
            const statusCounts = entries.reduce((counts, entry) => {
                counts[entry.status] = (counts[entry.status] ?? 0) + 1;
                return counts;
            }, {} as Partial<Record<Status, number>>);
            const ratingSum = ratings.reduce((sum, rating) => sum + rating, 0);
            return {
                userId,
                kind: mediaType,
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
        }));
        return byUser.size;
    }
}
