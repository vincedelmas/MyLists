import {eq, sql} from "drizzle-orm";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, tvDetails, tvProgress} from "@/lib/server/database/schema";
import {libraryStatsContributionBase} from "@/lib/server/domain/media/shared/library/library-stats-contribution.shared";


export class TvStatsContributionQuery {
    constructor(private readonly kind: TvMediaType) {
    }

    getContributions() {
        const rewatches = sql<number>`COALESCE((
            SELECT SUM(rewatch.count * season.episode_count)
            FROM tv_season_rewatch rewatch
            INNER JOIN tv_season season
                ON season.catalog_item_id = rewatch.catalog_item_id
                AND season.season_number = rewatch.season_number
            WHERE rewatch.library_entry_id = ${libraryEntry.id}
        ), 0)`;
        const watchedEpisodes = sql<number>`COALESCE(${tvProgress.watchedEpisodes}, 0) + ${rewatches}`;

        return getDbClient().select({
            ...libraryStatsContributionBase,
            timeSpent: sql<number>`${watchedEpisodes} * COALESCE(${tvDetails.episodeDurationMinutes}, 0)`,
            redo: sql<number>`COALESCE((SELECT SUM(count) FROM tv_season_rewatch WHERE library_entry_id = ${libraryEntry.id}), 0)`,
            specific: watchedEpisodes,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.kind, this.kind));
    }
}
