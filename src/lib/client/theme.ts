import {LayoutGrid} from "lucide-react";
import {AchievementDifficulty, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {getMediaTheme, MEDIA_THEME_COLORS} from "@/lib/client/components/media/media-theme";


type DifficultyColorVariant = "text" | "border" | "ring" | "bg";
type ThemeColorKey = MediaType | Status | "all" | "brand" | "overview";
type DifficultyColorKey = `${DifficultyColorVariant}-${AchievementDifficulty}`;


export const getThemeIcon = (type: MediaType | "all" | "overview") => {
    return type === "all" || type === "overview" ? LayoutGrid : getMediaTheme(type).icon;
};


const THEME_COLOR_MAP = {
    brand: "var(--brand)",
    all: "var(--muted-foreground)",
    overview: "var(--muted-foreground)",

    ...MEDIA_THEME_COLORS,

    [Status.IN_PROGRESS]: "var(--in_progress)",
    [Status.PLANNED]: "var(--planned)",
    [Status.COMPLETED]: "var(--completed)",
    [Status.ON_HOLD]: "var(--on_hold)",
    [Status.MULTIPLAYER]: "var(--multiplayer)",
    [Status.RANDOM]: "var(--random)",
    [Status.DROPPED]: "var(--dropped)",
    [Status.ENDLESS]: "var(--endless)",
} satisfies Record<ThemeColorKey, string>;


const UPDATE_TYPE_COLOR_MAP: Record<UpdateType, string> = {
    [UpdateType.STATUS]: "var(--brand)",
    [UpdateType.TV]: "var(--series)",
    [UpdateType.PLAYTIME]: "var(--games)",
    [UpdateType.PAGE]: "var(--books)",
    [UpdateType.CHAPTER]: "var(--manga)",
    [UpdateType.REDO]: "var(--favorite)",
    [UpdateType.RATING]: "var(--rating)",
    [UpdateType.COMMENT]: "var(--info)",
    [UpdateType.FAVORITE]: "var(--favorite)",
    [UpdateType.PLATFORM]: "var(--info)",
};


const DIFFICULTY_COLORS = {
    "border-bronze": "border-bronze",
    "border-silver": "border-silver",
    "border-gold": "border-gold",
    "border-platinum": "border-platinum",
    "ring-bronze": "ring-bronze",
    "ring-silver": "ring-silver",
    "ring-gold": "ring-gold",
    "ring-platinum": "ring-platinum",
    "bg-bronze": "bg-bronze",
    "bg-silver": "bg-silver",
    "bg-gold": "bg-gold",
    "bg-platinum": "bg-platinum",
    "text-bronze": "text-bronze",
    "text-silver": "text-silver",
    "text-gold": "text-gold",
    "text-platinum": "text-platinum",
} satisfies Record<DifficultyColorKey, string>;


export const getThemeColor = (type: ThemeColorKey | undefined) => {
    if (!type) return "var(--muted-foreground)";
    return THEME_COLOR_MAP[type];
}


export const getUpdateTypeColor = (updateType: UpdateType) => {
    return UPDATE_TYPE_COLOR_MAP[updateType];
}


export const getDifficultyColors = (difficulty: AchievementDifficulty | undefined, variant: DifficultyColorVariant = "text") => {
    if (!difficulty) return "";
    const key: DifficultyColorKey = `${variant}-${difficulty}`;
    return DIFFICULTY_COLORS[key];
};
