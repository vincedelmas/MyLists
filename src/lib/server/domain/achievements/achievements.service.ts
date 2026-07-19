import {AchievementTier} from "@/lib/schemas";
import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";
import {AchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";


export class AchievementsService {
    constructor(private repository: typeof AchievementsRepository) {
    }

    // --- Admin & Tasks -----------------------------------------------------------------

    async seedAchievements(mediaType: MediaType, achievements: readonly AchievementSeedData[]) {
        return this.repository.seedAchievements(mediaType, achievements);
    }

    async updateAchievementForAdmin(achId: number, name: string, description: string) {
        await this.repository.updateAchievementForAdmin(achId, name, description);
    }

    async updateTiersForAdmin(tiers: AchievementTier[]) {
        return this.repository.updateTiersForAdmin(tiers);
    }

    // -----------------------------------------------------------------------------------

    async getDifficultySummary(userId: number) {
        return this.repository.getDifficultySummary(userId);
    }

    async getAchievementsDetails(userId: number, limit = 3) {
        return this.repository.getAchievementsDetails(userId, limit);
    }

    async getAllAchievements() {
        return this.repository.getAllAchievements();
    }

    async getUserAchievementStats(userId: number) {
        const { completedResult, totalAchievementsResult } = await this.repository.getUserAchievementStats(userId);

        const mediaTypes = Object.values(MediaType);
        const difficulties = Object.values(AchievementDifficulty);

        const totalAchievementsMap = new Map(totalAchievementsResult.map((item) => [item.mediaType, item.total]));
        const completedCountsMap = new Map(completedResult.map((item) => [`${item.mediaType}-${item.difficulty}`, item.count]));
        const allDifficultySums = Object.fromEntries(difficulties.map((diff) => [diff, 0]));

        type TierStat = { count: number | string; tier: AchievementDifficulty | "total" };

        const mediaTypeEntries = {} as Record<MediaType, TierStat[]>;
        for (const mt of mediaTypes) {
            mediaTypeEntries[mt] = [] as TierStat[];
        }
        const results = { all: [] as TierStat[], ...mediaTypeEntries };

        let grandTotal = 0;
        let grandTotalGained = 0;
        for (const mediaType of mediaTypes) {
            let mediaTypeTotalGained = 0;
            const mediaTypeStats: TierStat[] = [];

            for (const difficulty of difficulties) {
                const count = completedCountsMap.get(`${mediaType}-${difficulty}`) || 0;
                mediaTypeStats.push({ tier: difficulty, count });
                allDifficultySums[difficulty] += count;
                mediaTypeTotalGained += count;
            }

            const mediaTypeAchievementTotal = totalAchievementsMap.get(mediaType) || 0;
            mediaTypeStats.push({ tier: "total", count: `${mediaTypeTotalGained}/${mediaTypeAchievementTotal}` });

            results[mediaType] = mediaTypeStats;

            grandTotal += mediaTypeAchievementTotal;
            grandTotalGained += mediaTypeTotalGained;
        }

        const allStats: TierStat[] = [];
        for (const difficulty of difficulties) {
            allStats.push({ tier: difficulty, count: allDifficultySums[difficulty] });
        }

        allStats.push({ tier: "total", count: `${grandTotalGained}/${grandTotal}` });
        results["all"] = allStats;

        return results;
    }

    async getUserAchievements(userId: number) {
        const results = await this.repository.getUserAchievements(userId);

        const uniqueAchIds = [...new Set(results.map((r) => r.achievement.id))];

        return uniqueAchIds.map((id) => {
            const rows = results.filter((r) => r.achievement.id === id);
            return {
                ...rows[0].achievement,
                tiers: rows.map(({ tier, userProgress }) => ({
                    ...tier,
                    count: userProgress?.count ?? 0,
                    progress: userProgress?.progress ?? 0,
                    completed: userProgress?.completed ?? false,
                    completedAt: userProgress?.completedAt ?? null,
                })),
            };
        }).sort((a, b) => a.mediaType.localeCompare(b.mediaType) || a.name.localeCompare(b.name));
    }

    async calculateAllAchievementsRarity() {
        return this.repository.calculateAllAchievementsRarity();
    }

    async calculateAchievement(achievement: Achievement, catalog: AchievementCatalog) {
        const progressQuery = catalog.buildProgressQuery(achievement);
        await this.repository.upsertAchievementProgress(achievement, progressQuery);
    }
}
