import {and, count, countDistinct, eq, gte, lte, max} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {bookAuthor, bookDetails, catalogItem, libraryEntry} from "@/lib/server/database/schema";
import {MediaAchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";


export class BookAchievementCalculator extends MediaAchievementCalculator {
    constructor() {
        super(MediaType.BOOKS);
    }

    getAchievementCte(achievement: Achievement, userId?: number) {
        const common = this.getCommonAchievementCte(achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "classic_books":
            case "young_adult_books":
            case "crime_books":
            case "fantasy_books":
                return this.countCompletedGenre(String(achievement.value), userId);
            case "short_books":
            case "long_books":
                return this.countDuration(achievement, userId);
            case "author_books":
                return this.maxAuthor(userId);
            case "lang_books":
                return this.countLanguages(userId);
            default:
                return this.unsupported(achievement);
        }
    }

    private countDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long")
            ? gte(bookDetails.pages, threshold)
            : lte(bookDetails.pages, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxAuthor(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookAuthor, eq(bookAuthor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, bookAuthor.name).as("grouped_book_author");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countLanguages(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(bookDetails.language).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }
}
