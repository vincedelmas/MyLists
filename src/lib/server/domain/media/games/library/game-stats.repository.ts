import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, desc, eq, gte, isNotNull, ne, SQL, sql} from "drizzle-orm";
import {libraryStatsContributionBase, rebuildLibraryStats} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {
    formatLibraryAffinity,
    getAggregatedLibraryStats,
    getLibraryRatingStats,
    getLibraryReleaseDateStats,
    getLibraryStatsEntryConditions,
    getLibraryTotalTags,
    libraryAffinityExpressions,
    LibraryStatsReadScope,
} from "@/lib/server/domain/media/shared/library/library-stats-read";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gameProgress,
    libraryEntry,
} from "@/lib/server/database/schema";


/** Game aggregate, advanced, and materialized library statistics. */
export class GameStatsRepository {
    static async rebuild() {
        const gamesContributions = await this.getRebuildContributions();
        return rebuildLibraryStats(MediaType.GAMES, gamesContributions);
    }

    static async getAggregatedMediaStats(scope: GameStatsReadScope) {
        return getAggregatedLibraryStats(MediaType.GAMES, scope);
    }

    static async getAdvancedMediaStats(scope: GameStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [
            ratings,
            totalTags,
            releaseDates,
            genresStats,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
        ] = await Promise.all([
            getLibraryRatingStats(MediaType.GAMES, userId),
            getLibraryTotalTags(MediaType.GAMES, userId),
            getLibraryReleaseDateStats(MediaType.GAMES, userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAveragePlaytime(userId),
            this.computePlaytimeDistribution(userId),
            this.computeCompanyAffinity(true, mediaAvgRating, userId),
            this.computeCompanyAffinity(false, mediaAvgRating, userId),
            this.computeProgressAffinity(gameProgress.platform, mediaAvgRating, userId),
            this.computeDetailsAffinity(gameDetails.gameEngine, mediaAvgRating, userId),
            this.computeDetailsAffinity(gameDetails.playerPerspective, mediaAvgRating, userId),
        ]);
        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
        };
    }

    private static getRebuildContributions() {
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
    }

    private static async computeAveragePlaytime(userId?: number) {
        return getDbClient().select({ value: sql<number | null>`AVG(${gameProgress.playtimeMinutes} / 60)` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId))).get()?.value ?? null;
    }

    private static computePlaytimeDistribution(userId?: number) {
        const bucket = sql<number>`floor(log(max(${gameProgress.playtimeMinutes} / 60, 1)) / log(2))`;
        return getDbClient().select({ name: bucket, value: count(catalogItem.id) }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId)))
            .groupBy(bucket).orderBy(asc(bucket))
            .then((rows) => rows.map((row) => ({ name: String(Math.pow(2, row.name)), value: row.value })));
    }

    private static async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(catalogGenre.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(...this.consumedConditions(userId), isNotNull(catalogGenre.name)))
            .groupBy(catalogGenre.name).having(gte(count(catalogGenre.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeCompanyAffinity(developer: boolean, mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(gameCompany.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: gameCompany.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameCompany, eq(gameCompany.catalogItemId, catalogItem.id))
            .where(and(
                ...this.consumedConditions(userId),
                isNotNull(gameCompany.name),
                developer ? eq(gameCompany.developer, true) : eq(gameCompany.publisher, true),
            ))
            .groupBy(gameCompany.name).having(gte(count(gameCompany.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeProgressAffinity(
        metric: typeof gameProgress.platform,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = libraryAffinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeDetailsAffinity(
        metric: typeof gameDetails.gameEngine | typeof gameDetails.playerPerspective,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = libraryAffinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static consumedConditions(userId?: number): SQL[] {
        return [...getLibraryStatsEntryConditions(MediaType.GAMES, userId), ne(libraryEntry.status, Status.PLAN_TO_PLAY)];
    }
}


export type GameStatsReadScope = LibraryStatsReadScope;
