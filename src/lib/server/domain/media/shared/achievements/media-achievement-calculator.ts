import {MediaType, Status} from "@/lib/utils/enums";
import {and, count, eq, isNotNull} from "drizzle-orm";
import {StatsCTE} from "@/lib/types/media-common.types";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogGenre, catalogItem, catalogItemGenre, libraryEntry} from "@/lib/server/database/schema";


export interface AchievementCalculator {
    getAchievementCte(achievement: Achievement, userId?: number): StatsCTE;
}


/** Shared achievement mechanisms; media calculators own their code-specific policies. */
export class AchievementCalculationHelpers {
    static getCommonAchievementCte(kind: MediaType, achievement: Achievement, userId?: number) {
        if (achievement.codeName.startsWith("completed_")) {
            return this.countEntries(kind, eq(libraryEntry.status, Status.COMPLETED), userId);
        }

        if (achievement.codeName.startsWith("rated_")) {
            return this.countEntries(kind, isNotNull(libraryEntry.rating), userId);
        }

        if (achievement.codeName.startsWith("comment_")) {
            return this.countEntries(kind, isNotNull(libraryEntry.comment), userId);
        }

        return undefined;
    }

    static countCompletedGenre(kind: MediaType, genre: string, userId?: number) {
        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: count(libraryEntry.catalogItemId).as("value"),
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(
                this.forUser(userId),
                eq(catalogItem.kind, kind),
                eq(catalogGenre.name, genre),
                eq(libraryEntry.status, Status.COMPLETED),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    static forUser(userId?: number) {
        return userId !== undefined ? eq(libraryEntry.userId, userId) : undefined;
    }

    static unsupported(kind: MediaType, achievement: Achievement): never {
        throw new Error(`${kind} achievement calculation is not implemented for ${achievement.codeName}.`);
    }

    private static countEntries(kind: MediaType, condition: ReturnType<typeof eq> | ReturnType<typeof isNotNull>, userId?: number) {
        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: count(libraryEntry.catalogItemId).as("value"),
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                condition,
                this.forUser(userId),
                eq(catalogItem.kind, kind),
            ))
            .groupBy(libraryEntry.userId).as("calculation");
    }
}
