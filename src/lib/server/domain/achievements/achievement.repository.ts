import {db} from "@/lib/server/database/db";
import {AchievementTier} from "@/lib/schemas";
import {StatsCTE} from "@/lib/types/media-common.types";
import {AchievementDifficulty} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementSeedData} from "@/lib/types/achievements.types";
import {and, asc, count, desc, eq, inArray, max, notInArray, SQL, sql} from "drizzle-orm";
import {achievement, achievementTier, profileMediaChannel, user, userAchievement} from "@/lib/server/database/schema";


const tierOrder = sql<number>`CASE ${achievementTier.difficulty}
    WHEN 'bronze' THEN 1
    WHEN 'silver' THEN 2
    WHEN 'gold' THEN 3
    WHEN 'platinum' THEN 4
    ELSE 0
END`;


export class AchievementRepository {
    static async getActiveMediaTypes(userId: number) {
        return getDbClient()
            .select({ mediaType: profileMediaChannel.kind })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.enabled, true)))
            .then((rows) => rows.map(({ mediaType }) => mediaType));
    }

    static async getDifficultySummary(userId: number) {
        const highestTier = getDbClient()
            .select({
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

        return getDbClient()
            .select({
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

        return getDbClient()
            .select({ value: count() })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, userAchievement.userId),
                eq(profileMediaChannel.kind, achievement.mediaType),
                eq(profileMediaChannel.enabled, true),
            )).where(and(...conditions))
            .get()?.value ?? 0;
    }

    static async getUserAchievementStats(userId: number) {
        const activeMediaTypes = await this.getActiveMediaTypes(userId);
        if (activeMediaTypes.length === 0) {
            return {
                completedResult: [],
                totalAchievementsResult: [],
            };
        }

        const highestTier = getDbClient()
            .select({
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

        const completedResult = await getDbClient()
            .select({
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

        const totalAchievementsResult = await getDbClient()
            .select({
                total: count().as("total"),
                mediaType: achievement.mediaType,
            }).from(achievement)
            .where(inArray(achievement.mediaType, activeMediaTypes))
            .groupBy(achievement.mediaType);

        return { completedResult, totalAchievementsResult };
    }

    static getUserAchievements(userId: number) {
        return getDbClient()
            .select({
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

    static getAllAchievements() {
        return getDbClient().query.achievement.findMany({
            orderBy: asc(achievement.id),
            with: {
                tiers: {
                    orderBy: tierOrder,
                },
            },
        });
    }

    static async seedAchievements(achievementsDef: readonly AchievementSeedData[]) {
        const tx = getDbClient();

        await Promise.all(achievementsDef.map(async (achievementData) => {
            const [syncedAchievement] = await tx
                .insert(achievement)
                .values({
                    name: achievementData.name,
                    codeName: achievementData.codeName,
                    mediaType: achievementData.mediaType,
                    value: achievementData.value?.toString(),
                    description: achievementData.description,
                })
                .onConflictDoUpdate({
                    target: achievement.codeName,
                    set: {
                        name: achievementData.name,
                        mediaType: achievementData.mediaType,
                        value: achievementData.value?.toString(),
                        description: achievementData.description,
                    },
                })
                .returning();

            const tierDiffs = achievementData.tiers.map((tier) => tier.difficulty);

            await tx
                .delete(achievementTier)
                .where(and(
                    notInArray(achievementTier.difficulty, tierDiffs),
                    eq(achievementTier.achievementId, syncedAchievement.id),
                ));

            await tx
                .insert(achievementTier)
                .values(achievementData.tiers.map((tierData) => ({
                    criteria: tierData.criteria,
                    difficulty: tierData.difficulty,
                    achievementId: syncedAchievement.id,
                })))
                .onConflictDoUpdate({
                    target: [achievementTier.achievementId, achievementTier.difficulty],
                    set: { criteria: sql`excluded.criteria` },
                });
        }));

        const mediaType = achievementsDef[0].mediaType;
        const achievementCodeNames = achievementsDef.map(({ codeName }) => codeName);

        const orphanedAchievementIds = await tx
            .select({ id: achievement.id })
            .from(achievement)
            .where(and(
                eq(achievement.mediaType, mediaType),
                notInArray(achievement.codeName, achievementCodeNames),
            ))
            .then((rows) => rows.map(({ id }) => id));

        if (orphanedAchievementIds.length > 0) {
            await tx
                .delete(achievement)
                .where(inArray(achievement.id, orphanedAchievementIds));
        }
    }

    static async updateAchievementForAdmin(achievementId: number, name: string, description: string) {
        await getDbClient()
            .update(achievement)
            .set({ name, description })
            .where(eq(achievement.id, achievementId));
    }

    static async updateTiersForAdmin(tiers: AchievementTier[]) {
        return db.transaction(async (tx) => {
            for (const tier of tiers) {
                await tx
                    .update(achievementTier)
                    .set({ criteria: tier.criteria })
                    .where(eq(achievementTier.id, tier.id));
            }
        });
    }

    static async updateAchievement(tier: AchievementTier, cte: StatsCTE, completed: SQL, countValue: SQL, progress: SQL, completedAt: SQL) {
        await getDbClient()
            .update(userAchievement)
            .set({
                progress,
                completed,
                completedAt,
                count: countValue,
                lastCalculatedAt: sql`datetime('now')`,
            }).from(cte)
            .where(and(
                eq(userAchievement.tierId, tier.id),
                sql`${userAchievement.userId} = calculation.user_id`,
                eq(userAchievement.achievementId, tier.achievementId),
            ));
    }

    static async insertAchievement(tier: AchievementTier, cte: StatsCTE, completed: SQL, countValue: SQL, progress: SQL) {
        getDbClient().run(sql`
            INSERT INTO ${userAchievement} (
                tier_id,
                user_id,
                achievement_id,
                count,
                progress,
                completed,
                completed_at,
                last_calculated_at
            )
            SELECT
                ${tier.id},
                calculation.user_id,
                ${tier.achievementId},
                ${countValue},
                ${progress},
                ${completed},
                CASE WHEN ${completed} THEN datetime('now') ELSE NULL END,
                datetime('now')
            FROM ${cte}
            WHERE NOT EXISTS (
                SELECT 1 FROM ${userAchievement} ua
                WHERE ua.tier_id = ${tier.id}
                    AND ua.achievement_id = ${tier.achievementId}
                    AND ua.user_id = calculation.user_id
            )
        `);
    }

    static async calculateAllAchievementsRarity() {
        const totalActiveUsers = getDbClient()
            .select({ count: count() })
            .from(user)
            .where(eq(user.emailVerified, true))
            .get();

        const raritySubquery = getDbClient()
            .select({
                tierId: userAchievement.tierId,
                count: count(userAchievement.userId).as("count"),
            })
            .from(userAchievement)
            .where(eq(userAchievement.completed, true))
            .groupBy(userAchievement.tierId)
            .as("rarity_subquery");

        await getDbClient()
            .update(achievementTier)
            .set({ rarity: sql`COALESCE((100.0 * ${raritySubquery.count} / ${totalActiveUsers?.count ?? 0}), 0)` })
            .from(raritySubquery)
            .where(eq(achievementTier.id, raritySubquery.tierId));
    }
}
