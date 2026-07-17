import {and, count, countDistinct, eq, gte, lte, max} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, movieActor, movieDetails} from "@/lib/server/database/schema";
import {MediaAchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";


export class MovieAchievementCalculator extends MediaAchievementCalculator {
    constructor() {
        super(MediaType.MOVIES);
    }

    getAchievementCte(achievement: Achievement, userId?: number) {
        const common = this.getCommonAchievementCte(achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "war_genre_movies":
            case "family_genre_movies":
            case "sci_genre_movies":
            case "animation_movies":
                return this.countCompletedGenre(String(achievement.value), userId);
            case "short_movies":
            case "long_movies":
                return this.countDuration(achievement, userId);
            case "director_movies":
                return this.maxDirector(userId);
            case "actor_movies":
                return this.maxActor(userId);
            case "origin_lang_movies":
                return this.countLanguages(userId);
            default:
                return this.unsupported(achievement);
        }
    }

    private countDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long")
            ? gte(movieDetails.durationMinutes, threshold)
            : lte(movieDetails.durationMinutes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxDirector(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, movieDetails.directorName).as("grouped_movie_director");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private maxActor(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieActor, eq(movieActor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, movieActor.name).as("grouped_movie_actor");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countLanguages(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(movieDetails.originalLanguage).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }
}
