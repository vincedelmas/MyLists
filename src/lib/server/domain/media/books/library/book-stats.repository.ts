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
    bookAuthor,
    bookDetails,
    bookProgress,
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
} from "@/lib/server/database/schema";


/** Book aggregate, advanced, and materialized library statistics. */
export class BookStatsRepository {
    static async rebuild() {
        const booksContributions = await this.getRebuildContributions();
        return rebuildLibraryStats(MediaType.BOOKS, booksContributions);
    }

    static async getAggregatedMediaStats(scope: BookStatsReadScope) {
        return getAggregatedLibraryStats(MediaType.BOOKS, scope);
    }

    static async getAdvancedMediaStats(scope: BookStatsReadScope, mediaAvgRating: number | null) {
        const userId = scope.type === "library" ? scope.access.ownerId : undefined;
        const [
            ratings,
            totalTags,
            releaseDates,
            genresStats,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
            langsStats,
        ] = await Promise.all([
            getLibraryRatingStats(MediaType.BOOKS, userId),
            getLibraryTotalTags(MediaType.BOOKS, userId),
            getLibraryReleaseDateStats(MediaType.BOOKS, userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAveragePages(userId),
            this.computePageDistribution(userId),
            this.computeDetailsAffinity(bookDetails.publisher, mediaAvgRating, userId),
            this.computeAuthorAffinity(mediaAvgRating, userId),
            this.computeDetailsAffinity(bookDetails.language, mediaAvgRating, userId),
        ]);
        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
            langsStats,
        };
    }

    private static getRebuildContributions() {
        const totalPages = sql<number>`COALESCE(${bookProgress.totalPagesRead}, 0)`;

        return getDbClient()
            .select({
                ...libraryStatsContributionBase,
                specific: totalPages,
                timeSpent: sql<number>`${totalPages} * 1.7`,
                redo: sql<number>`COALESCE(${bookProgress.rereadCount}, 0)`,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, MediaType.BOOKS));
    }

    private static async computeAveragePages(userId?: number) {
        return getDbClient().select({ value: sql<number | null>`AVG(${bookDetails.pages})` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId))).get()?.value ?? null;
    }

    private static computePageDistribution(userId?: number) {
        const bucket = sql<number>`floor(${bookDetails.pages} / 100.0) * 100`;
        return getDbClient().select({ name: bucket, value: count(catalogItem.id) }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId)))
            .groupBy(bucket).orderBy(asc(bucket))
            .then((rows) => rows.map((row) => ({ name: String(row.name), value: row.value })));
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

    private static async computeAuthorAffinity(mediaAvgRating: number | null, userId?: number) {
        const expressions = libraryAffinityExpressions(bookAuthor.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: bookAuthor.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookAuthor, eq(bookAuthor.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(bookAuthor.name)))
            .groupBy(bookAuthor.name).having(gte(count(bookAuthor.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeDetailsAffinity(
        metric: typeof bookDetails.publisher | typeof bookDetails.language,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = libraryAffinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static consumedConditions(userId?: number): SQL[] {
        return [...getLibraryStatsEntryConditions(MediaType.BOOKS, userId), ne(libraryEntry.status, Status.PLAN_TO_READ)];
    }
}


export type BookStatsReadScope = LibraryStatsReadScope;
