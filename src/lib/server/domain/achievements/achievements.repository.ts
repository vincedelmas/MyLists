import {db} from "@/lib/server/database/db";
import {AchievementTier} from "@/lib/schemas";
import {StatsCTE} from "@/lib/types/media-common.types";
import {AchievementDifficulty} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementSeedData} from "@/lib/types/achievements.types";
import {and, asc, count, desc, eq, inArray, max, notInArray, SQL, sql} from "drizzle-orm";
import {achievement, achievementTier, user, userAchievement, userMediaSettings} from "@/lib/server/database/schema";


export class AchievementsRepository {
    static async seedAchievements(achievementsDef: readonly AchievementSeedData[]) {
        const tx = getDbClient();

        // Upsert achievements and tiers
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

        // Remove orphaned achievements and tiers
        const mediaType = achievementsDef[0].mediaType;
        const achCodeNames = achievementsDef.map((ach) => ach.codeName);

        const orphanedAchievementIds = await tx
            .select({ id: achievement.id })
            .from(achievement)
            .where(and(eq(achievement.mediaType, mediaType), notInArray(achievement.codeName, achCodeNames)))
            .then((rows) => rows.map((r) => r.id));

        if (orphanedAchievementIds.length > 0) {
            await tx.delete(achievement).where(inArray(achievement.id, orphanedAchievementIds));
        }
    }

    static async updateAchievementForAdmin(achId: number, name: string, description: string) {
        await getDbClient()
            .update(achievement)
            .set({ name, description })
            .where(eq(achievement.id, achId));
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

    static async getDifficultySummary(userId: number) {
        const tierOrder = this._getSQLTierOrdering();

        const subq = getDbClient()
            .select({
                achievementId: userAchievement.achievementId,
                maxTierOrder: max(tierOrder).as("maxTierOrder"),
            })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userAchievement.userId),
                eq(userMediaSettings.mediaType, achievement.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.completed, true)))
            .groupBy(userAchievement.achievementId)
            .as("subq");

        const results = await getDbClient()
            .select({
                count: count(),
                difficulty: achievementTier.difficulty,
            })
            .from(achievementTier)
            .innerJoin(subq, and(eq(achievementTier.achievementId, subq.achievementId), eq(tierOrder, subq.maxTierOrder)))
            .groupBy(achievementTier.difficulty)
            .orderBy(tierOrder);

        return results;
    }

    static async getAchievementsDetails(userId: number, limit = 3) {
        const results = await getDbClient()
            .select({
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                difficulty: achievementTier.difficulty,
                completedAt: userAchievement.completedAt,
            })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userAchievement.userId),
                eq(userMediaSettings.mediaType, achievement.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.completed, true)))
            .orderBy(desc(userAchievement.completedAt))
            .limit(limit);

        return results;
    }

    static async countPlatinumAchievements(userId?: number) {
        const forUser = userId ? eq(userAchievement.userId, userId) : undefined;

        const result = getDbClient()
            .select({ count: count() })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userAchievement.userId),
                eq(userMediaSettings.mediaType, achievement.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(
                forUser,
                eq(userAchievement.completed, true),
                eq(achievementTier.difficulty, AchievementDifficulty.PLATINUM),
            ))
            .get();

        return result?.count ?? 0;
    }

    static async getUserAchievementStats(userId: number) {
        const tierOrder = this._getSQLTierOrdering();

        const activeMediaTypes = await getDbClient()
            .select({ mediaType: userMediaSettings.mediaType })
            .from(userMediaSettings)
            .where(and(eq(userMediaSettings.userId, userId), eq(userMediaSettings.active, true)))
            .then((rows) => rows.map((r) => r.mediaType));

        const subq = getDbClient()
            .select({
                mediaType: achievement.mediaType,
                achievementId: userAchievement.achievementId,
                maxTierOrder: max(tierOrder).as("maxTierOrder"),
            })
            .from(userAchievement)
            .innerJoin(achievementTier, eq(userAchievement.tierId, achievementTier.id))
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(
                eq(userAchievement.userId, userId),
                eq(userAchievement.completed, true),
                inArray(achievement.mediaType, activeMediaTypes),
            ))
            .groupBy(achievement.mediaType, userAchievement.achievementId)
            .as("subq");

        const completedResult = await getDbClient()
            .select({
                mediaType: subq.mediaType,
                count: count().as("count"),
                difficulty: achievementTier.difficulty,
            })
            .from(achievementTier)
            .innerJoin(subq, and(eq(achievementTier.achievementId, subq.achievementId), eq(tierOrder, subq.maxTierOrder)))
            .groupBy(subq.mediaType, achievementTier.difficulty)
            .orderBy(subq.mediaType, tierOrder);

        const totalAchievementsResult = await getDbClient()
            .select({
                total: count().as("total"),
                mediaType: achievement.mediaType,
            })
            .from(achievement)
            .where(inArray(achievement.mediaType, activeMediaTypes))
            .groupBy(achievement.mediaType);

        return { completedResult, totalAchievementsResult };
    }

    static async getUserAchievements(userId: number) {
        const tierOrder = this._getSQLTierOrdering();

        const results = await getDbClient()
            .select({
                tier: achievementTier,
                achievement: achievement,
                userProgress: userAchievement,
            })
            .from(achievement)
            .innerJoin(achievementTier, eq(achievement.id, achievementTier.achievementId))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userId),
                eq(userMediaSettings.mediaType, achievement.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .leftJoin(userAchievement, and(eq(achievementTier.id, userAchievement.tierId), eq(userAchievement.userId, userId)))
            .orderBy(achievement.id, tierOrder);

        return results;
    }

    static async getAllAchievements() {
        const tierOrder = this._getSQLTierOrdering();

        return getDbClient().query.achievement.findMany({
            orderBy: asc(achievement.id),
            with: {
                tiers: {
                    orderBy: tierOrder,
                },
            },
        });
    }

    static async updateAchievement(tier: AchievementTier, cte: StatsCTE, completed: SQL, count: SQL, progress: SQL, completedAt: SQL) {
        await getDbClient()
            .update(userAchievement)
            .set({
                count: count,
                progress: progress,
                completed: completed,
                completedAt: completedAt,
                lastCalculatedAt: sql`datetime('now')`,
            }).from(cte)
            .where(and(
                eq(userAchievement.tierId, tier.id),
                sql`${userAchievement.userId} = calculation.user_id`,
                eq(userAchievement.achievementId, tier.achievementId),
            ));
    }

    static async insertAchievement(tier: AchievementTier, cte: StatsCTE, completed: SQL, count: SQL, progress: SQL) {
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
                ${count},
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

        const raritySubq = getDbClient()
            .select({
                tierId: userAchievement.tierId,
                count: count(userAchievement.userId).as("count"),
            })
            .from(userAchievement)
            .where(eq(userAchievement.completed, true))
            .groupBy(userAchievement.tierId)
            .as("rarity_subq");

        await getDbClient()
            .update(achievementTier)
            .set({
                rarity: sql`COALESCE((100.0 * ${raritySubq.count} / ${totalActiveUsers?.count ?? 0}), 0)`,
            })
            .from(raritySubq)
            .where(eq(achievementTier.id, raritySubq.tierId));
    }

    private static _getSQLTierOrdering() {
        return sql<number>`CASE ${achievementTier.difficulty}
            WHEN 'bronze' THEN 1
            WHEN 'silver' THEN 2
            WHEN 'gold' THEN 3
            WHEN 'platinum' THEN 4
            ELSE 0
        END`;
    }
}
