import {sql} from "drizzle-orm";
import {AchievementTier} from "@/lib/schemas";
import {userAchievement} from "@/lib/server/database/schema";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";
import {StatsCTE} from "@/lib/types/media-common.types";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {AchievementsReadService} from "@/lib/server/domain/achievements/achievements-read.service";


export class AchievementsService {
    private readonly reader = new AchievementsReadService();

    constructor(private repository: typeof AchievementsRepository) {
    }

    // --- Admin & Tasks -----------------------------------------------------------------

    async seedAchievements(achievements: readonly AchievementSeedData[]) {
        return this.repository.seedAchievements(achievements);
    }

    async updateAchievementForAdmin(achId: number, name: string, description: string) {
        await this.repository.updateAchievementForAdmin(achId, name, description);
    }

    async updateTiersForAdmin(tiers: AchievementTier[]) {
        return this.repository.updateTiersForAdmin(tiers);
    }

    // -----------------------------------------------------------------------------------

    async getDifficultySummary(userId: number) {
        return this.reader.getDifficultySummary(userId);
    }

    async getAchievementsDetails(userId: number, limit = 3) {
        return this.reader.getAchievementsDetails(userId, limit);
    }

    async getActiveMediaTypes(userId: number) {
        return this.reader.getActiveMediaTypes(userId);
    }

    async getAllAchievements() {
        return this.repository.getAllAchievements();
    }

    async getUserAchievementStats(userId: number) {
        return this.reader.getUserAchievementStats(userId);
    }

    async getUserAchievements(userId: number) {
        return this.reader.getUserAchievements(userId);
    }

    async calculateAllAchievementsRarity() {
        return this.repository.calculateAllAchievementsRarity();
    }

    async calculateAchievementFromCte(achievement: Achievement, achievementCTE: StatsCTE) {
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

            await this.repository.updateAchievement(tier, achievementCTE, completed, count, progress, completedAt);
            await this.repository.insertAchievement(tier, achievementCTE, completed, count, progress);
        }
    }
}
