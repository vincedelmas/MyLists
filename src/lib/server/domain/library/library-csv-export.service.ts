import {and, eq, inArray} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    bookProgress,
    catalogItem,
    gameProgress,
    libraryEntry,
    mangaProgress,
    movieProgress,
    tvProgress,
    tvSeason,
    tvSeasonRewatch,
} from "@/lib/server/database/schema";
import {mediaTypeToApiProvider} from "@/lib/utils/media-mapping";
import {MediaType} from "@/lib/utils/enums";
import {MYLISTS_CSV_VERSION} from "@/lib/server/domain/imports/parsers/mylists.parser";


/** Produces the portable v1 CSV contract from the canonical catalog/library model. */
export class LibraryCsvExportService {
    async export(userId: number, mediaType: MediaType) {
        const base = {
            mediaName: catalogItem.name,
            externalApiId: catalogItem.primaryExternalId,
            releaseDate: catalogItem.releaseDate,
            status: libraryEntry.status,
            favorite: libraryEntry.favorite,
            comment: libraryEntry.comment,
            rating: libraryEntry.rating,
        };
        const metadata = {
            mediaType,
            formatVersion: MYLISTS_CSV_VERSION,
            externalApiSource: mediaTypeToApiProvider(mediaType),
        };
        const conditions = and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, mediaType));

        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            const rows = await getDbClient().select({
                ...base,
                entryId: libraryEntry.id,
                catalogItemId: catalogItem.id,
                currentSeason: tvProgress.currentSeason,
                currentEpisode: tvProgress.currentEpisode,
                total: tvProgress.watchedEpisodes,
            }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
                .where(conditions);
            if (rows.length === 0) return [];
            const [seasons, rewatches] = await Promise.all([
                getDbClient().select().from(tvSeason)
                    .where(inArray(tvSeason.catalogItemId, rows.map(({ catalogItemId }) => catalogItemId)))
                    .orderBy(tvSeason.seasonNumber),
                getDbClient().select().from(tvSeasonRewatch)
                    .where(inArray(tvSeasonRewatch.libraryEntryId, rows.map(({ entryId }) => entryId)))
                    .orderBy(tvSeasonRewatch.seasonNumber),
            ]);
            return rows.map(({ entryId, catalogItemId, ...row }) => {
                const itemSeasons = seasons.filter((season) => season.catalogItemId === catalogItemId);
                const itemRewatches = rewatches.filter((rewatch) => rewatch.libraryEntryId === entryId);
                const redo2 = itemSeasons.map((season) =>
                    itemRewatches.find((rewatch) => rewatch.seasonNumber === season.seasonNumber)?.count ?? 0,
                );
                return { ...row, ...metadata, redo2, redo: redo2.reduce((sum, count) => sum + count, 0) };
            });
        }

        if (mediaType === MediaType.MOVIES) {
            return getDbClient().select({ ...base, total: movieProgress.watchCount })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
                .where(conditions)
                .then((rows) => rows.map((row) => ({
                    ...row,
                    ...metadata,
                    redo: Math.max(0, row.total - 1),
                })));
        }

        if (mediaType === MediaType.GAMES) {
            return getDbClient().select({ ...base, playtime: gameProgress.playtimeMinutes, platform: gameProgress.platform })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
                .where(conditions)
                .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
        }

        if (mediaType === MediaType.BOOKS) {
            return getDbClient().select({
                ...base,
                actualPage: bookProgress.currentPage,
                redo: bookProgress.rereadCount,
                total: bookProgress.totalPagesRead,
            }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
                .where(conditions)
                .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
        }

        return getDbClient().select({
            ...base,
            currentChapter: mangaProgress.currentChapter,
            redo: mangaProgress.rereadCount,
            total: mangaProgress.totalChaptersRead,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(conditions)
            .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
    }
}
