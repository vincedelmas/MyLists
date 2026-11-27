import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import type {AchievementRarityTier} from "@/lib/types/achievements.types";


export const RARE_RARITY_THRESHOLD = 10;
export const ULTRA_RARE_RARITY_THRESHOLD = 3;
export const RARITY_MIN_LEVEL = 5;
const UNCOMMON_RARITY_THRESHOLD = 30;


export const NON_MEDIA_ACHIEVEMENT_CATEGORIES = [
    AchievementCategory.GENERAL,
    AchievementCategory.MINIGAMES,
    AchievementCategory.COMMUNITY,
    AchievementCategory.SECRETS,
] as const;


export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
    [AchievementCategory.MOVIES]: "Movies",
    [AchievementCategory.SERIES]: "Series",
    [AchievementCategory.ANIME]: "Anime",
    [AchievementCategory.GAMES]: "Games",
    [AchievementCategory.BOOKS]: "Books",
    [AchievementCategory.MANGA]: "Manga",
    [AchievementCategory.GENERAL]: "General",
    [AchievementCategory.MINIGAMES]: "Minigames",
    [AchievementCategory.COMMUNITY]: "Community",
    [AchievementCategory.SECRETS]: "Secrets",
};


const MEDIA_TYPE_SET = new Set<string>(Object.values(MediaType));


export function isMediaAchievementCategory(category: AchievementCategory): category is MediaType {
    return MEDIA_TYPE_SET.has(category);
}


export function getAchievementRarityTier(rarity: number | null | undefined): AchievementRarityTier {
    if (rarity === null || rarity === undefined || rarity <= 0) return "common";
    if (rarity < ULTRA_RARE_RARITY_THRESHOLD) return "ultra";
    if (rarity < RARE_RARITY_THRESHOLD) return "rare";
    if (rarity < UNCOMMON_RARITY_THRESHOLD) return "uncommon";
    return "common";
}


export function isRareAchievement(rarity: number | null | undefined) {
    return rarity !== null && rarity !== undefined && rarity > 0 && rarity < RARE_RARITY_THRESHOLD;
}


export function getRaritySortValue(rarity: number | null | undefined) {
    return rarity !== null && rarity !== undefined && rarity > 0 ? rarity : 101;
}
