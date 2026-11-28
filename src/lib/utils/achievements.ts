import {formatNumber} from "@/lib/utils/formatting/number";
import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import type {AchievementRarityTier} from "@/lib/types/achievements.types";


export const RARITY_MIN_LEVEL = 5;

export const RARE_RARITY_THRESHOLD = 10;

export const ULTRA_RARE_RARITY_THRESHOLD = 3;


export const NON_MEDIA_ACHIEVEMENT_CATEGORIES = [
    AchievementCategory.GENERAL,
    AchievementCategory.MINIGAMES,
    AchievementCategory.COMMUNITY,
    AchievementCategory.SECRETS,
] as const;


export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
    [AchievementCategory.SERIES]: "Series",
    [AchievementCategory.ANIME]: "Anime",
    [AchievementCategory.MOVIES]: "Movies",
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
    return "common";
}


export function isRareAchievement(rarity: number | null | undefined) {
    return rarity !== null && rarity !== undefined && rarity > 0 && rarity < RARE_RARITY_THRESHOLD;
}


export function getRaritySortValue(rarity: number | null | undefined) {
    return rarity !== null && rarity !== undefined && rarity > 0 ? rarity : 101;
}


export function formatAchievementCount(count: number) {
    return Number.isInteger(count) ? formatNumber(count) : formatNumber(count, { fractionDigits: 1 });
}


const UNIT_RULES: Array<[RegExp, [singular: string, plural: string]]> = [
    [/_hours_|_time_/, ["hour", "hours"]],
    [/_episodes_/, ["episode", "episodes"]],
    [/_pages_/, ["page", "pages"]],
    [/_chapters_/, ["chapter", "chapters"]],
    [/_genres_/, ["genre", "genres"]],
    [/_languages_/, ["language", "languages"]],
    [/_networks_/, ["network", "networks"]],
    [/_platforms_/, ["platform", "platforms"]],
    [/_rewatch_|_redo_/, ["rewatch", "rewatches"]],
    [/_decades_/, ["decade", "decades"]],
    [/_active_months_/, ["month", "months"]],
    [/_polymath_|_full_house/, ["media type", "media types"]],
    [/_streak_/, ["day", "days"]],
    [/_wins_/, ["win", "wins"]],
    [/_wcf_score_/, ["round", "rounds"]],
    [/_wcf_runs_/, ["run", "runs"]],
    [/_liked/, ["like", "likes"]],
    [/_tags_/, ["tag", "tags"]],
    [/^movies_/, ["movie", "movies"]],
    [/^series_/, ["series", "series"]],
    [/^anime_/, ["anime", "anime"]],
    [/^games_/, ["game", "games"]],
    [/^books_/, ["book", "books"]],
    [/^manga_/, ["manga", "manga"]],
];


export function formatAchievementRemaining(codeName: string, remaining: number) {
    const safeRemaining = Math.max(1, remaining);
    const match = UNIT_RULES.find(([pattern]) => pattern.test(codeName));
    const [singular, plural] = match ? match[1] : ["title", "titles"];

    return `${formatNumber(safeRemaining)} ${safeRemaining === 1 ? singular : plural}`;
}
