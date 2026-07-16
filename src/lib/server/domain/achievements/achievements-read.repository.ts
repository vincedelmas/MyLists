import {AchievementDifficulty} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {achievement, achievementTier, profileMediaChannel, userAchievement,} from "@/lib/server/database/schema";
import {and, count, desc, eq, inArray, max, sql} from "drizzle-orm";


const tierOrder = sql<number>`CASE ${achievementTier.difficulty}
    WHEN 'bronze' THEN 1
    WHEN 'silver' THEN 2
    WHEN 'gold' THEN 3
    WHEN 'platinum' THEN 4
    ELSE 0
END`;


export class AchievementsReadRepository {
    static async getActiveMediaTypes(userId: number) {
        return getDbClient().select({ mediaType: profileMediaChannel.kind })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.enabled, true)))
            .then((rows) => rows.map(({ mediaType }) => mediaType));
    }

    static async getDifficultySummary(userId: number) {
        const highestTier = getDbClient().select({
            achievementId: userAchievement.achievementId,
            maxTierOrder: max(tierOrder).as("maxTierOrder"),
        }).from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, userAchievement.userId),
                eq(profileMediaChannel.kind, achievement.mediaType),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.completed, true)))
            .groupBy(userAchievement.achievementId)
            .as("highest_achievement_tier");
        return getDbClient().select({
            count: count(),
            difficulty: achievementTier.difficulty,
        }).from(achievementTier)
            .innerJoin(highestTier, and(
                eq(achievementTier.achievementId, highestTier.achievementId),
                eq(tierOrder, highestTier.maxTierOrder),
            ))
            .groupBy(achievementTier.difficulty)
            .orderBy(tierOrder);
    }

    static getAchievementsDetails(userId: number, limit = 3) {
        return getDbClient()
            .select({
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                difficulty: achievementTier.difficulty,
                completedAt: userAchievement.completedAt,
            }).from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, userAchievement.userId),
                eq(profileMediaChannel.kind, achievement.mediaType),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.completed, true)))
            .orderBy(desc(userAchievement.completedAt))
            .limit(limit);
    }

    static async countPlatinumAchievements(userId?: number) {
        const conditions = [
            eq(userAchievement.completed, true),
            eq(achievementTier.difficulty, AchievementDifficulty.PLATINUM),
        ];
        if (userId !== undefined) conditions.push(eq(userAchievement.userId, userId));
        return getDbClient().select({ value: count() })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, userAchievement.userId),
                eq(profileMediaChannel.kind, achievement.mediaType),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(...conditions)).get()?.value ?? 0;
    }

    static async getUserAchievementStats(userId: number) {
        const activeMediaTypes = await this.getActiveMediaTypes(userId);
        if (activeMediaTypes.length === 0) return { completedResult: [], totalAchievementsResult: [] };
        const highestTier = getDbClient().select({
            mediaType: achievement.mediaType,
            achievementId: userAchievement.achievementId,
            maxTierOrder: max(tierOrder).as("maxTierOrder"),
        }).from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(
                eq(userAchievement.userId, userId),
                eq(userAchievement.completed, true),
                inArray(achievement.mediaType, activeMediaTypes),
            ))
            .groupBy(achievement.mediaType, userAchievement.achievementId)
            .as("achievement_stats_highest_tier");
        const completedResult = await getDbClient().select({
            mediaType: highestTier.mediaType,
            count: count().as("count"),
            difficulty: achievementTier.difficulty,
        }).from(achievementTier)
            .innerJoin(highestTier, and(
                eq(achievementTier.achievementId, highestTier.achievementId),
                eq(tierOrder, highestTier.maxTierOrder),
            ))
            .groupBy(highestTier.mediaType, achievementTier.difficulty)
            .orderBy(highestTier.mediaType, tierOrder);
        const totalAchievementsResult = await getDbClient().select({
            total: count().as("total"),
            mediaType: achievement.mediaType,
        }).from(achievement)
            .where(inArray(achievement.mediaType, activeMediaTypes))
            .groupBy(achievement.mediaType);
        return { completedResult, totalAchievementsResult };
    }

    static getUserAchievements(userId: number) {
        return getDbClient().select({
            tier: achievementTier,
            achievement,
            userProgress: userAchievement,
        }).from(achievement)
            .innerJoin(achievementTier, eq(achievement.id, achievementTier.achievementId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, userId),
                eq(profileMediaChannel.kind, achievement.mediaType),
                eq(profileMediaChannel.enabled, true),
            ))
            .leftJoin(userAchievement, and(
                eq(achievementTier.id, userAchievement.tierId),
                eq(userAchievement.userId, userId),
            ))
            .orderBy(achievement.id, tierOrder);
    }
}
