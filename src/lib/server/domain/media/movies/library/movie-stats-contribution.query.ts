import {eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, movieDetails, movieProgress} from "@/lib/server/database/schema";
import {libraryStatsContributionBase} from "@/lib/server/domain/media/shared/library/library-stats-contribution.shared";


export class MovieStatsContributionQuery {
    getContributions() {
        const watchCount = sql<number>`COALESCE(${movieProgress.watchCount}, 0)`;
        return getDbClient().select({
            ...libraryStatsContributionBase,
            timeSpent: sql<number>`${watchCount} * COALESCE(${movieDetails.durationMinutes}, 0)`,
            redo: sql<number>`MAX(${watchCount} - 1, 0)`,
            specific: watchCount,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.kind, MediaType.MOVIES));
    }
}
