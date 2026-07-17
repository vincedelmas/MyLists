import {eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaProgress} from "@/lib/server/database/schema";
import {libraryStatsContributionBase} from "@/lib/server/domain/library/library-stats-contribution.shared";


export class MangaStatsContributionQuery {
    getContributions() {
        const totalChapters = sql<number>`COALESCE(${mangaProgress.totalChaptersRead}, 0)`;
        return getDbClient().select({
            ...libraryStatsContributionBase,
            timeSpent: sql<number>`${totalChapters} * 7`,
            redo: sql<number>`COALESCE(${mangaProgress.rereadCount}, 0)`,
            specific: totalChapters,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, MediaType.MANGA));
    }
}
