import {and, eq, inArray} from "drizzle-orm";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, tvProgress, tvSeason, tvSeasonRewatch} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";


export const exportTvLibraryCsv = async (kind: TvMediaType, userId: number) => {
    const metadata = libraryCsvMetadata(kind);

    const rows = await getDbClient()
        .select({
            ...libraryCsvBaseSelection,
            entryId: libraryEntry.id,
            catalogItemId: catalogItem.id,
            total: tvProgress.watchedEpisodes,
            currentSeason: tvProgress.currentSeason,
            currentEpisode: tvProgress.currentEpisode,
        }).from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
        .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, kind)));

    if (rows.length === 0) return [];

    const [seasons, rewatches] = await Promise.all([
        getDbClient()
            .select()
            .from(tvSeason)
            .where(inArray(tvSeason.catalogItemId, rows.map(({ catalogItemId }) => catalogItemId)))
            .orderBy(tvSeason.seasonNumber),
        getDbClient()
            .select()
            .from(tvSeasonRewatch)
            .where(inArray(tvSeasonRewatch.libraryEntryId, rows.map(({ entryId }) => entryId)))
            .orderBy(tvSeasonRewatch.seasonNumber),
    ]);

    return rows.map(({ entryId, catalogItemId, ...row }) => {
        const itemSeasons = seasons.filter((season) => season.catalogItemId === catalogItemId);
        const itemRewatches = rewatches.filter((rewatch) => rewatch.libraryEntryId === entryId);
        const redo2 = itemSeasons.map(s => itemRewatches.find(r => r.seasonNumber === s.seasonNumber)?.count ?? 0);

        return {
            ...row,
            ...metadata,
            redo2,
            redo: redo2.reduce((sum, count) => sum + count, 0),
        };
    });
};
