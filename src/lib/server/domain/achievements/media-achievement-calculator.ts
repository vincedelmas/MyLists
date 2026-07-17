import {and, count, eq, isNotNull} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogGenre, catalogItem, catalogItemGenre, libraryEntry} from "@/lib/server/database/schema";


/** Shared achievement mechanisms; concrete media calculators own their code-specific policies. */
export abstract class MediaAchievementCalculator {
    protected constructor(protected readonly kind: MediaType) {}

    protected getCommonAchievementCte(achievement: Achievement, userId?: number) {
        if (achievement.codeName.startsWith("completed_")) {
            return this.countEntries(eq(libraryEntry.status, Status.COMPLETED), userId);
        }
        if (achievement.codeName.startsWith("rated_")) {
            return this.countEntries(isNotNull(libraryEntry.rating), userId);
        }
        if (achievement.codeName.startsWith("comment_")) {
            return this.countEntries(isNotNull(libraryEntry.comment), userId);
        }
        return undefined;
    }

    protected countCompletedGenre(genre: string, userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: count(libraryEntry.catalogItemId).as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(libraryEntry.status, Status.COMPLETED),
                eq(catalogGenre.name, genre),
                this.forUser(userId),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    protected forUser(userId?: number) {
        return userId ? eq(libraryEntry.userId, userId) : undefined;
    }

    protected unsupported(achievement: Achievement): never {
        throw new Error(`${this.kind} achievement calculation is not implemented for ${achievement.codeName}.`);
    }

    private countEntries(condition: ReturnType<typeof eq> | ReturnType<typeof isNotNull>, userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: count(libraryEntry.catalogItemId).as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(eq(catalogItem.kind, this.kind), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }
}
