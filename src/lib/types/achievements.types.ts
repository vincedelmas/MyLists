import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


export type Achievement = {
    id: number;
    name: string;
    codeName: string;
    description: string;
    mediaType: MediaType;
    value: string | null;
    tiers: AchievementTier[];
};


type AchievementTier = {
    id: number;
    achievementId: number;
    rarity: number | null;
    criteria: { count: number };
    difficulty: AchievementDifficulty;
};


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
