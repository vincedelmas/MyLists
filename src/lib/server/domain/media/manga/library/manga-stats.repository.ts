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
    mangaAuthor,
    mangaDetails,
    mangaProgress,
} from "@/lib/server/database/schema";


/** Manga aggregate, advanced, and materialized library statistics. */
export class MangaStatsRepository {
    static async rebuild() {
        const mangaContributions = await this.getRebuildContributions();
        return rebuildLibraryStats(MediaType.MANGA, mangaContributions);
    }

    static async getAggregatedMediaStats(scope: MangaStatsReadScope) {
        return getAggregatedLibraryStats(MediaType.MANGA, scope);
    }

    static async getAdvancedMediaStats(scope: MangaStatsReadScope, mediaAvgRating: number | null) {
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
        ] = await Promise.all([
            getLibraryRatingStats(MediaType.MANGA, userId),
            getLibraryTotalTags(MediaType.MANGA, userId),
            getLibraryReleaseDateStats(MediaType.MANGA, userId),
            this.computeGenreAffinity(mediaAvgRating, userId),
            this.computeAverageChapters(userId),
            this.computeChapterDistribution(userId),
            this.computeDetailsAffinity(mangaDetails.publisher, mediaAvgRating, userId),
            this.computeAuthorAffinity(mediaAvgRating, userId),
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
        };
    }

    private static getRebuildContributions() {
        const totalChapters = sql<number>`COALESCE(${mangaProgress.totalChaptersRead}, 0)`;

        return getDbClient()
            .select({
                ...libraryStatsContributionBase,
                specific: totalChapters,
                timeSpent: sql<number>`${totalChapters} * 7`,
                redo: sql<number>`COALESCE(${mangaProgress.rereadCount}, 0)`,
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .leftJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(eq(catalogItem.kind, MediaType.MANGA));
    }

    private static async computeAverageChapters(userId?: number) {
        return getDbClient().select({ value: sql<number | null>`AVG(${mangaDetails.chapters})` })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaDetails.chapters))).get()?.value ?? null;
    }

    private static computeChapterDistribution(userId?: number) {
        const bucket = sql<number>`floor(${mangaDetails.chapters} / 50.0) * 50`;
        return getDbClient().select({ name: bucket, value: count(catalogItem.id) }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaDetails.chapters)))
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
        const expressions = libraryAffinityExpressions(mangaAuthor.name, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: mangaAuthor.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaAuthor, eq(mangaAuthor.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(mangaAuthor.name)))
            .groupBy(mangaAuthor.name).having(gte(count(mangaAuthor.name), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static async computeDetailsAffinity(
        metric: typeof mangaDetails.publisher,
        mediaAvgRating: number | null,
        userId?: number,
    ) {
        const expressions = libraryAffinityExpressions(metric, mediaAvgRating);
        const rows = await getDbClient().select({ ...expressions.selection, name: metric })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(...this.consumedConditions(userId), isNotNull(metric)))
            .groupBy(metric).having(gte(count(metric), 3))
            .orderBy(desc(expressions.affinity)).limit(10);
        return formatLibraryAffinity(rows);
    }

    private static consumedConditions(userId?: number): SQL[] {
        return [...getLibraryStatsEntryConditions(MediaType.MANGA, userId), ne(libraryEntry.status, Status.PLAN_TO_READ)];
    }
}


export type MangaStatsReadScope = LibraryStatsReadScope;
