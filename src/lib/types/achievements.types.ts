import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import type {AchievementRepository} from "@/lib/server/domain/achievements/achievement.repository";


export type Achievement = Awaited<ReturnType<typeof AchievementRepository.getAllAchievements>>[number];


export type AchievementSeedData = {
    name: string,
    codeName: string,
    description: string,
    mediaType: MediaType,
    value?: number | string,
    tiers: readonly TierData[],
}


type TierData = {
    criteria: { count: number },
    difficulty: AchievementDifficulty,
}
