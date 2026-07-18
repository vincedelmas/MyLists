import {MediaType, Status} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, countDistinct, eq, gte, lte, max, ne} from "drizzle-orm";
import {catalogItem, libraryEntry, tvActor, tvDetails, tvNetwork} from "@/lib/server/database/schema";
import {AchievementCalculationHelpers} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";


export class TvAchievementCalculator {
    private static readonly helper = AchievementCalculationHelpers;

    static getAchievementCte(achievement: Achievement, userId?: number) {
        const kind = this.getMediaType(achievement);

        const common = this.helper.getCommonAchievementCte(kind, achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "comedy_series":
            case "drama_series":
            case "shonen_anime":
            case "seinen_anime":
                return this.helper.countCompletedGenre(kind, String(achievement.value), userId);
            case "short_series":
            case "long_series":
            case "short_anime":
            case "long_anime":
                return this.countDuration(kind, achievement, userId);
            case "network_series":
            case "network_anime":
                return this.countNetworks(kind, userId);
            case "actor_anime":
                return this.maxActor(kind, userId);
            default:
                return this.helper.unsupported(kind, achievement);
        }
    }

    private static countDuration(kind: TvMediaType, achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);

        const durationCondition = achievement.codeName.includes("long")
            ? gte(tvDetails.totalEpisodes, threshold)
            : lte(tvDetails.totalEpisodes, threshold);

        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: count(libraryEntry.catalogItemId).as("value"),
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                durationCondition,
                eq(catalogItem.kind, kind),
                this.helper.forUser(userId),
                eq(libraryEntry.status, Status.COMPLETED),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private static countNetworks(kind: TvMediaType, userId?: number) {
        return getDbClient()
            .select({
                userId: libraryEntry.userId,
                value: countDistinct(tvNetwork.name).as("value"),
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvNetwork, eq(tvNetwork.catalogItemId, catalogItem.id))
            .where(and(
                this.helper.forUser(userId),

                eq(catalogItem.kind, kind),
                ne(libraryEntry.status, Status.PLAN_TO_WATCH),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private static maxActor(kind: TvMediaType, userId?: number) {
        const grouped = getDbClient()
            .select({
                userId: libraryEntry.userId,
                count: count(libraryEntry.catalogItemId).as("count"),
            }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvActor, eq(tvActor.catalogItemId, catalogItem.id))
            .where(and(
                this.helper.forUser(userId),
                eq(catalogItem.kind, kind),
                eq(libraryEntry.status, Status.COMPLETED),
            )).groupBy(libraryEntry.userId, tvActor.name).as("grouped_tv_actor");

        return getDbClient()
            .select({
                userId: grouped.userId,
                value: max(grouped.count).as("value"),
            }).from(grouped)
            .groupBy(grouped.userId).as("calculation");
    }

    private static getMediaType(achievement: Achievement) {
        if (achievement.mediaType === MediaType.SERIES || achievement.mediaType === MediaType.ANIME) {
            return achievement.mediaType;
        }
        throw new Error(`TV calculator cannot calculate a ${achievement.mediaType} achievement.`);
    }
}
