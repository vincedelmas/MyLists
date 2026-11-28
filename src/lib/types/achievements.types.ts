import {AchievementCategory, MediaType} from "@/lib/utils/enums";


export type AchievementBadgePattern = "rings" | "rays" | "dots";
export type AchievementRarityTier = "common" | "rare" | "ultra";
export type AchievementBadgeShape = "circle" | "hex" | "octagon" | "shield" | "diamond";


export type AchievementIconKey =
    | "film-projector"
    | "ticket"
    | "popcorn"
    | "crown"
    | "stars"
    | "chat"
    | "clapperboard"
    | "masks"
    | "globe"
    | "hourglass"
    | "stopwatch"
    | "palette"
    | "film-strip"
    | "tv"
    | "radio-tower"
    | "video-camera"
    | "ninja"
    | "katana"
    | "punch"
    | "bridge"
    | "microphone"
    | "gamepad"
    | "controller"
    | "joystick"
    | "trophy"
    | "diamond-trophy"
    | "clockwork"
    | "castle"
    | "swords"
    | "open-book"
    | "book-cover"
    | "bookshelf"
    | "quill"
    | "spell-book"
    | "dragon"
    | "scroll"
    | "book-pile"
    | "sparkles"
    | "compass"
    | "hearts"
    | "cycle"
    | "calendar"
    | "card-random"
    | "eye-target"
    | "flame"
    | "laurel-crown"
    | "alarm-clock"
    | "bookmark"
    | "archive"
    | "funnel"
    | "tag"
    | "team"
    | "vote"
    | "secret-book"
    | "magnifying-glass"
    | "keyboard"
    | "owl"
    | "thumb-down"
    | "cobweb"
    | "jester"
    | "bullseye"
    | "medal"
    | "broken-heart"
    | "rocket"
    | "love-letter"
    | "infinity"
    | "question";


export type AchievementMetadata = {
    label?: string;
} | null;


export const CLIENT_EVENT_ACHIEVEMENT_CODES = [
    "secret_privacy_policy",
    "secret_command_palette",
    "secret_night_owl",
] as const;
export type ClientEventAchievementCode = (typeof CLIENT_EVENT_ACHIEVEMENT_CODES)[number];


export type Achievement = {
    id: number;
    name: string;
    target: number;
    secret: boolean;
    codeName: string;
    sortOrder: number;
    description: string;
    rarity: number | null;
    icon: AchievementIconKey;
    mediaType: MediaType | null;
    shape: AchievementBadgeShape;
    category: AchievementCategory;
    pattern: AchievementBadgePattern;
};


export type AchievementSeedData = {
    name: string;
    target: number;
    secret?: boolean;
    codeName: string;
    sortOrder: number;
    description: string;
    icon: AchievementIconKey;
    mediaType: MediaType | null;
    shape: AchievementBadgeShape;
    category: AchievementCategory;
    pattern: AchievementBadgePattern;
};


export type UnlockedAchievementToast = {
    id: number;
    name: string;
    secret: boolean;
    codeName: string;
    description: string;
    rarity: number | null;
    icon: AchievementIconKey;
    shape: AchievementBadgeShape;
    category: AchievementCategory;
    metadata: AchievementMetadata;
    pattern: AchievementBadgePattern;
};


export type UserAchievementItem = Achievement & {
    count: number;
    progress: number;
    completed: boolean;
    completedAt: string | null;
    metadata: AchievementMetadata;
};


export type ProfileAchievementItem = {
    id: number;
    name: string;
    secret: boolean;
    codeName: string;
    description: string;
    completedAt: string;
    rarity: number | null;
    icon: AchievementIconKey;
    mediaType: MediaType | null;
    shape: AchievementBadgeShape;
    category: AchievementCategory;
    metadata: AchievementMetadata;
    pattern: AchievementBadgePattern;
};


export type ProfileAchievementsShowcase = {
    rareUnlocked: number;
    totalUnlocked: number;
    totalAvailable: number;
    mode: "pinned" | "rarest";
    items: ProfileAchievementItem[];
    perfectCategories: AchievementCategory[];
};


export type AdminAchievementRow = Achievement & {
    unlockedCount: number;
    eligibleUsers: number;
};
