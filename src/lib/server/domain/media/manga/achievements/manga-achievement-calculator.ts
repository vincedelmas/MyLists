import {MediaType, Status} from "@/lib/utils/enums";
import {Achievement} from "@/lib/types/achievements.types";
import {and, count, eq, gte, lte, max, sum} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaAuthor, mangaDetails, mangaProgress} from "@/lib/server/database/schema";
import {AchievementCalculationHelpers} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";


export class MangaAchievementCalculator {
    private static readonly helper = AchievementCalculationHelpers;

    static getAchievementCte(achievement: Achievement, userId?: number) {
        const common = this.helper.getCommonAchievementCte(MediaType.MANGA, achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "hentai_manga":
            case "shounen_manga":
            case "seinen_manga":
                return this.helper.countCompletedGenre(MediaType.MANGA, String(achievement.value), userId);
            case "short_manga":
            case "long_manga":
                return this.countDuration(achievement, userId);
            case "author_manga":
                return this.maxAuthor(userId);
            case "publisher_manga":
                return this.maxPublisher(userId);
            case "chapter_manga":
                return this.sumChapters(userId);
            default:
                return this.helper.unsupported(MediaType.MANGA, achievement);
        }
    }

    private static countDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);

        const condition = achievement.codeName.includes("long")
            ? gte(mangaDetails.chapters, threshold)
            : lte(mangaDetails.chapters, threshold);

        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: count(libraryEntry.catalogItemId).as("value"),
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(
                condition,
                this.helper.forUser(userId),
                eq(catalogItem.kind, MediaType.MANGA),
                eq(libraryEntry.status, Status.COMPLETED),
            ))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private static maxAuthor(userId?: number) {
        const grouped = getDbClient()
            .select({
                userId: libraryEntry.userId,
                count: count(libraryEntry.catalogItemId).as("count"),
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaAuthor, eq(mangaAuthor.catalogItemId, catalogItem.id))
            .where(and(
                this.helper.forUser(userId),
                eq(catalogItem.kind, MediaType.MANGA),
                eq(libraryEntry.status, Status.COMPLETED),
            ))
            .groupBy(libraryEntry.userId, mangaAuthor.name).as("grouped_manga_author");

        return getDbClient()
            .select({
                userId: grouped.userId,
                value: max(grouped.count).as("value"),
            }).from(grouped)
            .groupBy(grouped.userId).as("calculation");
    }

    private static maxPublisher(userId?: number) {
        const grouped = getDbClient()
            .select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(
                this.helper.forUser(userId),
                eq(catalogItem.kind, MediaType.MANGA),
                eq(libraryEntry.status, Status.COMPLETED),
            ))
            .groupBy(libraryEntry.userId, mangaDetails.publisher).as("grouped_manga_publisher");

        return getDbClient()
            .select({
                userId: grouped.userId,
                value: max(grouped.count).as("value"),
            }).from(grouped)
            .groupBy(grouped.userId).as("calculation");
    }

    private static sumChapters(userId?: number) {
        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: sum(mangaProgress.totalChaptersRead).as("value"),
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(and(
                this.helper.forUser(userId),
                eq(catalogItem.kind, MediaType.MANGA),
            ))
            .groupBy(libraryEntry.userId).as("calculation");
    }
}
