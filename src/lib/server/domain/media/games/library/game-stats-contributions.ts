import {eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameProgress, libraryEntry} from "@/lib/server/database/schema";
import {GetLibraryStatsContributions} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {libraryStatsContributionBase} from "@/lib/server/domain/media/shared/library/library-stats-contribution.shared";


export const getGameStatsContributions = (() => {
    return getDbClient()
        .select({
            ...libraryStatsContributionBase,
            redo: sql<number>`0`,
            specific: sql<number>`0`,
            timeSpent: sql<number>`COALESCE(${gameProgress.playtimeMinutes}, 0)`,
        }).from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .leftJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
        .where(eq(catalogItem.kind, MediaType.GAMES));
}) satisfies GetLibraryStatsContributions;
