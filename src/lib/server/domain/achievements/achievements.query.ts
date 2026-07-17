import {AchievementDifficulty, compareMediaTypes, MEDIA_TYPES, MediaType} from "@/lib/utils/enums";
import {AchievementsReadRepository} from "@/lib/server/domain/achievements/achievements-read.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";


export class AchievementsQuery {
    constructor(
        private readonly repository = AchievementsReadRepository,
        private readonly definitions = AchievementsRepository,
    ) {}

    getAllAchievements() {
        return this.definitions.getAllAchievements();
    }

    getDifficultySummary(userId: number) {
        return this.repository.getDifficultySummary(userId);
    }

    getAchievementsDetails(userId: number, limit = 3) {
        return this.repository.getAchievementsDetails(userId, limit);
    }

    countPlatinumAchievements(userId?: number) {
        return this.repository.countPlatinumAchievements(userId);
    }

    getActiveMediaTypes(userId: number) {
        return this.repository.getActiveMediaTypes(userId);
    }

    async getUserAchievementStats(userId: number) {
        const { completedResult, totalAchievementsResult } = await this.repository.getUserAchievementStats(userId);
        const mediaTypes = MEDIA_TYPES;
        const difficulties = Object.values(AchievementDifficulty);
        const totals = new Map(totalAchievementsResult.map(({ mediaType, total }) => [mediaType, total]));
        const completed = new Map(completedResult.map((item) => [`${item.mediaType}-${item.difficulty}`, item.count]));
        const allDifficultySums = Object.fromEntries(difficulties.map((difficulty) => [difficulty, 0]));
        type TierStat = { count: number | string; tier: AchievementDifficulty | "total" };
        const results = {
            all: [] as TierStat[],
            ...Object.fromEntries(mediaTypes.map((mediaType) => [mediaType, [] as TierStat[]])),
        } as Record<MediaType | "all", TierStat[]>;
        let grandTotal = 0;
        let grandTotalGained = 0;
        for (const mediaType of mediaTypes) {
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

    async getUserAchievements(userId: number) {
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
}
