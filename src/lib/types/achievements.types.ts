import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import {AchievementsQuery} from "@/lib/server/domain/achievements/achievements.query";


export type Achievement = Awaited<ReturnType<AchievementsQuery["getAllAchievements"]>>[number];


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
