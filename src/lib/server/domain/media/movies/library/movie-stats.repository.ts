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
    libraryEntry,
    movieActor,
    movieDetails,
    movieProgress,
} from "@/lib/server/database/schema";


/** Movie aggregate, advanced, and materialized library statistics. */
export class MovieStatsRepository {
    static async rebuild() {
        const moviesContribution = await this.getRebuildContributions();
        return rebuildLibraryStats(MediaType.MOVIES, moviesContribution);
    }

    static async getAggregatedMediaStats(scope: MovieStatsReadScope) {
        return getAggregatedLibraryStats(MediaType.MOVIES, scope);
    }

    static async getAdvancedMediaStats(scope: MovieStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;

        const [
            ratings,
            totalTags,
            releaseDates,
            genresStats,
            avgDuration,
            durationDistrib,
            budgetRevenue,
            directorsStats,
            actorsStats,
            langsStats,
        ] = await Promise.all([
            getLibraryRatingStats(MediaType.MOVIES, userId),
            getLibraryTotalTags(MediaType.MOVIES, userId),
            getLibraryReleaseDateStats(MediaType.MOVIES, userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAverageDuration(userId),
            this.computeDurationDistribution(userId),
            this.computeBudgetRevenue(userId),
            this.computeDirectorAffinity(mediaAvgRating, userId),
            this.computeActorAffinity(mediaAvgRating, userId),
            this.computeLanguageAffinity(mediaAvgRating, userId),
        ]);

        return {
            ratings,
            totalTags,
            langsStats,
            genresStats,
            actorsStats,
            avgDuration,
            releaseDates,
            directorsStats,
            durationDistrib,
            totalBudget: budgetRevenue.totalBudget,
            totalRevenue: budgetRevenue.totalRevenue,
        };
    }

    private static getRebuildContributions() {
        const watchCount = sql<number>`COALESCE(${movieProgress.watchCount}, 0)`;

        return getDbClient()
            .select({
                ...libraryStatsContributionBase,
                specific: watchCount,
                redo: sql<number>`MAX(${watchCount} - 1, 0)`,
                timeSpent: sql<number>`${watchCount} * COALESCE(${movieDetails.durationMinutes}, 0)`,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .leftJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.kind, MediaType.MOVIES));
    }

    private static async computeAverageDuration(userId?: number) {
        return getDbClient()
            .select({ value: sql<number | null>`AVG(${movieDetails.durationMinutes})` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId)))
            .get()?.value ?? null;
    }

    private static computeDurationDistribution(userId?: number) {
        const bucket = sql<number>`floor(${movieDetails.durationMinutes} / 30.0) * 30`;
        return getDbClient()
            .select({ name: bucket.mapWith(String), value: count(catalogItem.id) })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId)))
            .groupBy(bucket)
            .orderBy(asc(bucket));
    }

    private static async computeBudgetRevenue(userId?: number) {
        const row = await getDbClient()
            .select({
                totalBudget: sql<number>`COALESCE(SUM(${movieDetails.budget}), 0)`,
                totalRevenue: sql<number>`COALESCE(SUM(${movieDetails.revenue}), 0)`,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId)))
            .get();
        return { totalBudget: row?.totalBudget ?? 0, totalRevenue: row?.totalRevenue ?? 0 };
    }

    private static async computeGenreAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(catalogGenre.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(...this.consumedConditions(userId), isNotNull(catalogGenre.name)))
            .groupBy(catalogGenre.name)
            .having(gte(count(catalogGenre.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeActorAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(movieActor.name, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: movieActor.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieActor, eq(movieActor.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(movieActor.name)))
            .groupBy(movieActor.name)
            .having(gte(count(movieActor.name), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeDirectorAffinity(mediaAvgRating: number | null, userId?: number) {
        return this.computeDetailsAffinity(movieDetails.directorName, mediaAvgRating, userId);
    }

    private static async computeLanguageAffinity(mediaAvgRating: number | null, userId?: number) {
        return this.computeDetailsAffinity(movieDetails.originalLanguage, mediaAvgRating, userId);
    }

    private static consumedConditions(userId?: number): SQL[] {
        return [...getLibraryStatsEntryConditions(MediaType.MOVIES, userId), ne(libraryEntry.status, Status.PLAN_TO_WATCH)];
    }

    private static async computeDetailsAffinity(
        metric: typeof movieDetails.directorName | typeof movieDetails.originalLanguage,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = libraryAffinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient()
            .select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric)
            .having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity))
            .limit(10);
        return formatLibraryAffinity(rows);
    }
}


export type MovieStatsReadScope = LibraryStatsReadScope;
