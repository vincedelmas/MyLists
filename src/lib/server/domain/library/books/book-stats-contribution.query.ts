import {eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {bookProgress, catalogItem, libraryEntry} from "@/lib/server/database/schema";
import {libraryStatsContributionBase} from "@/lib/server/domain/library/library-stats-contribution.shared";


export class BookStatsContributionQuery {
    getContributions() {
        const totalPages = sql<number>`COALESCE(${bookProgress.totalPagesRead}, 0)`;
        return getDbClient().select({
            ...libraryStatsContributionBase,
            timeSpent: sql<number>`${totalPages} * 1.7`,
            redo: sql<number>`COALESCE(${bookProgress.rereadCount}, 0)`,
            specific: totalPages,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, MediaType.BOOKS));
    }
}
