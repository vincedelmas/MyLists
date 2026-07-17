import {and, count, countDistinct, eq, gte, lte, max, ne} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {Status} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, tvActor, tvDetails, tvNetwork} from "@/lib/server/database/schema";
import {MediaAchievementCalculator} from "@/lib/server/domain/achievements/media-achievement-calculator";


export class TvAchievementCalculator extends MediaAchievementCalculator {
    constructor(kind: TvMediaType) {
        super(kind);
    }

    getAchievementCte(achievement: Achievement, userId?: number) {
        const common = this.getCommonAchievementCte(achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "comedy_series":
            case "drama_series":
            case "shonen_anime":
            case "seinen_anime":
                return this.countCompletedGenre(String(achievement.value), userId);
            case "short_series":
            case "long_series":
            case "short_anime":
            case "long_anime":
                return this.countDuration(achievement, userId);
            case "network_series":
            case "network_anime":
                return this.countNetworks(userId);
            case "actor_anime":
                return this.maxActor(userId);
            default:
                return this.unsupported(achievement);
        }
    }

    private countDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const durationCondition = achievement.codeName.includes("long")
            ? gte(tvDetails.totalEpisodes, threshold)
            : lte(tvDetails.totalEpisodes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(libraryEntry.status, Status.COMPLETED),
                durationCondition,
                this.forUser(userId),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private countNetworks(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(tvNetwork.name).as("value") })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvNetwork, eq(tvNetwork.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), ne(libraryEntry.status, Status.PLAN_TO_WATCH), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxActor(userId?: number) {
        const grouped = getDbClient().select({
            userId: libraryEntry.userId,
            count: count(libraryEntry.catalogItemId).as("count"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvActor, eq(tvActor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, tvActor.name).as("grouped_tv_actor");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }
}
