import {and, count, countDistinct, eq, gte, inArray, like, lte, max, notInArray, sql} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {GamesPlatformsEnum, MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameCompany, gameDetails, gameProgress, libraryEntry} from "@/lib/server/database/schema";
import {MediaAchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";


export class GameAchievementCalculator extends MediaAchievementCalculator {
    constructor() {
        super(MediaType.GAMES);
    }

    getAchievementCte(achievement: Achievement, userId?: number) {
        const common = this.getCommonAchievementCte(achievement, userId);
        if (common) return common;

        switch (achievement.codeName) {
            case "hack_slash_games":
                return this.countCompletedGenre(String(achievement.value), userId);
            case "multiplayer_games":
                return this.countGames(and(like(gameDetails.gameModes, `%${String(achievement.value)}%`), this.playedStatus()), userId);
            case "log_hours_games":
                return this.sumHours(userId);
            case "platform_games":
                return this.countPlatforms(userId);
            case "pc_games":
                return this.countSpecificPlatform(achievement.value as GamesPlatformsEnum, userId);
            case "short_games":
            case "long_games":
                return this.countPlaytime(achievement, userId);
            case "developer_games":
            case "publisher_games":
                return this.maxCompany(achievement.value === "developer", userId);
            case "first_person_games":
                return this.countGames(and(eq(gameDetails.playerPerspective, String(achievement.value)), this.playedStatus()), userId);
            default:
                return this.unsupported(achievement);
        }
    }

    private sumHours(userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: sql<number>`sum(${gameProgress.playtimeMinutes}) / 60`.as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, this.kind), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countPlatforms(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(gameProgress.platform).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, this.kind), this.playedStatus(), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countSpecificPlatform(platform: GamesPlatformsEnum, userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, this.kind), eq(gameProgress.platform, platform), this.playedStatus(), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countPlaytime(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long")
            ? gte(gameProgress.playtimeMinutes, threshold)
            : lte(gameProgress.playtimeMinutes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                condition,
                inArray(libraryEntry.status, [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
                this.forUser(userId),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private maxCompany(developer: boolean, userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameCompany, eq(gameCompany.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                this.playedStatus(),
                developer ? eq(gameCompany.developer, true) : eq(gameCompany.publisher, true),
                this.forUser(userId),
            )).groupBy(libraryEntry.userId, gameCompany.name).as("grouped_game_company");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countGames(condition: ReturnType<typeof and>, userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, this.kind), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private playedStatus() {
        return notInArray(libraryEntry.status, [Status.DROPPED, Status.PLAN_TO_PLAY]);
    }
}
