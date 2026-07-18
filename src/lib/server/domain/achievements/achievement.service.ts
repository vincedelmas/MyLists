import {sql} from "drizzle-orm";
import {AchievementTier} from "@/lib/schemas";
import {StatsCTE} from "@/lib/types/media-common.types";
import {userAchievement} from "@/lib/server/database/schema";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";
import {AchievementRepository} from "@/lib/server/domain/achievements/achievement.repository";
import {AchievementDifficulty, compareMediaTypes, MEDIA_TYPES, MediaType} from "@/lib/utils/enums";


export class AchievementService {
    private static readonly repository = AchievementRepository;

    static getAllAchievements() {
        return this.repository.getAllAchievements();
    }

    static getDifficultySummary(userId: number) {
        return this.repository.getDifficultySummary(userId);
    }

    static getAchievementsDetails(userId: number, limit = 3) {
        return this.repository.getAchievementsDetails(userId, limit);
    }

    static countPlatinumAchievements(userId?: number) {
        return this.repository.countPlatinumAchievements(userId);
    }

    static getActiveMediaTypes(userId: number) {
        return this.repository.getActiveMediaTypes(userId);
    }

    static async getUserAchievementStats(userId: number) {
        const { completedResult, totalAchievementsResult } = await this.repository.getUserAchievementStats(userId);

        const difficulties = Object.values(AchievementDifficulty);

        const totals = new Map(totalAchievementsResult.map(({ mediaType, total }) => [mediaType, total]));
        const completed = new Map(completedResult.map((item) => [`${item.mediaType}-${item.difficulty}`, item.count]));
        const allDifficultySums = Object.fromEntries(difficulties.map((difficulty) => [difficulty, 0]));

        type TierStat = { count: number | string; tier: AchievementDifficulty | "total" };

        const results = {
            all: [] as TierStat[],
            ...Object.fromEntries(MEDIA_TYPES.map((mediaType) => [mediaType, [] as TierStat[]])),
        } as Record<MediaType | "all", TierStat[]>;

        let grandTotal = 0;
        let grandTotalGained = 0;

        for (const mediaType of MEDIA_TYPES) {
            let gained = 0;
            for (const difficulty of difficulties) {
                const value = completed.get(`${mediaType}-${difficulty}`) || 0;
                results[mediaType].push({ tier: difficulty, count: value });
                allDifficultySums[difficulty] += value;
                gained += value;
            }

            const total = totals.get(mediaType) || 0;
            results[mediaType].push({ tier: "total", count: `${gained}/${total}` });
            grandTotal += total;
            grandTotalGained += gained;
        }

        for (const difficulty of difficulties) {
            results.all.push({ tier: difficulty, count: allDifficultySums[difficulty] });
        }

        results.all.push({ tier: "total", count: `${grandTotalGained}/${grandTotal}` });
        return results;
    }

    static async getUserAchievements(userId: number) {
        const rows = await this.repository.getUserAchievements(userId);

        const uniqueIds = [...new Set(rows.map((row) => row.achievement.id))];

        return uniqueIds.map((id) => {
            const achievementRows = rows.filter((row) => row.achievement.id === id);
            return {
                ...achievementRows[0].achievement,
                tiers: achievementRows.map(({ tier, userProgress }) => ({
                    ...tier,
                    count: userProgress?.count ?? 0,
                    progress: userProgress?.progress ?? 0,
                    completed: userProgress?.completed ?? false,
                    completedAt: userProgress?.completedAt ?? null,
                })),
            };
        }).sort((left, right) => compareMediaTypes(left.mediaType, right.mediaType) || left.name.localeCompare(right.name));
    }

    static seedAchievements(achievements: readonly AchievementSeedData[]) {
        return this.repository.seedAchievements(achievements);
    }

    static updateAchievementForAdmin(achievementId: number, name: string, description: string) {
        return this.repository.updateAchievementForAdmin(achievementId, name, description);
    }

    static updateTiersForAdmin(tiers: AchievementTier[]) {
        return this.repository.updateTiersForAdmin(tiers);
    }

    static calculateAllAchievementsRarity() {
        return this.repository.calculateAllAchievementsRarity();
    }

    static async calculateAchievementFromCte(achievement: Achievement, achievementCte: StatsCTE) {
        for (const tier of achievement.tiers) {
            const valueNeeded = tier.criteria.count;

            const count = sql`calculation.value`;
            const completed = sql`calculation.value >= ${valueNeeded}`;
            const progress = sql`CASE
                WHEN (calculation.value * 100.0 / ${valueNeeded}) < 100.0
                THEN (calculation.value * 100.0 / ${valueNeeded})
                ELSE 100.0
            END`;

            const completedAt = sql`CASE
                WHEN calculation.value >= ${valueNeeded} AND ${userAchievement.completed} = false
                THEN datetime('now')
                ELSE ${userAchievement.completedAt}
            END`;

            await this.repository.updateAchievement(tier, achievementCte, completed, count, progress, completedAt);
            await this.repository.insertAchievement(tier, achievementCte, completed, count, progress);
        }
    }
}
