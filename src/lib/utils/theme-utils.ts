import {AchievementDifficulty, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {BookImage, Cat, Gamepad2, LayoutGrid, Library, Monitor, Popcorn} from "lucide-react";


export const THEME_ICONS_MAP = {
    all: LayoutGrid,
    overview: LayoutGrid,
    [MediaType.SERIES]: Monitor,
    [MediaType.ANIME]: Cat,
    [MediaType.MOVIES]: Popcorn,
    [MediaType.GAMES]: Gamepad2,
    [MediaType.BOOKS]: Library,
    [MediaType.MANGA]: BookImage,
};


const THEME_COLOR_MAP: Record<string, string> = {
    brand: "var(--brand)",

    [MediaType.SERIES]: "var(--color-series)",
    [MediaType.ANIME]: "var(--color-anime)",
    [MediaType.MOVIES]: "var(--color-movies)",
    [MediaType.BOOKS]: "var(--color-books)",
    [MediaType.GAMES]: "var(--color-games)",
    [MediaType.MANGA]: "var(--color-manga)",

    [Status.PLAYING]: "var(--color-playing)",
    [Status.READING]: "var(--color-reading)",
    [Status.WATCHING]: "var(--color-watching)",
    [Status.COMPLETED]: "var(--color-completed)",
    [Status.ON_HOLD]: "var(--color-on_hold)",
    [Status.MULTIPLAYER]: "var(--color-multiplayer)",
    [Status.RANDOM]: "var(--color-random)",
    [Status.DROPPED]: "var(--color-dropped)",
    [Status.ENDLESS]: "var(--color-endless)",
    [Status.PLAN_TO_WATCH]: "var(--color-plan_to_watch)",
    [Status.PLAN_TO_READ]: "var(--color-plan_to_read)",
    [Status.PLAN_TO_PLAY]: "var(--color-plan_to_play)",
};


const STATIC_MEDIA_COLOR_MAP: Record<MediaType, string> = {
    [MediaType.SERIES]: "#51c7d5",
    [MediaType.ANIME]: "#ef7d62",
    [MediaType.MOVIES]: "#e6b744",
    [MediaType.GAMES]: "#50bd67",
    [MediaType.BOOKS]: "#ba83d4",
    [MediaType.MANGA]: "#ea6ea8",
};


const UPDATE_TYPE_COLOR_MAP: Record<UpdateType, string> = {
    [UpdateType.STATUS]: "var(--brand)",
    [UpdateType.TV]: "var(--color-series)",
    [UpdateType.PLAYTIME]: "var(--color-games)",
    [UpdateType.PAGE]: "var(--color-books)",
    [UpdateType.CHAPTER]: "var(--color-manga)",
    [UpdateType.REDO]: "var(--color-favorite)",
    [UpdateType.RATING]: "var(--color-rating)",
    [UpdateType.COMMENT]: "var(--color-info)",
    [UpdateType.FAVORITE]: "var(--color-favorite)",
    [UpdateType.PLATFORM]: "var(--color-info)",
};


const DIFFICULTY_COLORS: Record<string, string> = {
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
};


export const STATIC_BRAND_COLOR = "#20d69b";


export const getThemeColor = (type: MediaType | Status | string | undefined) => {
    if (!type) return "var(--color-muted-foreground)";
    return THEME_COLOR_MAP[type] ?? "var(--color-muted-foreground)";
};


export const getStaticMediaColor = (mediaType: MediaType) => {
    return STATIC_MEDIA_COLOR_MAP[mediaType];
}


export const getUpdateTypeColor = (updateType: UpdateType) => {
    return UPDATE_TYPE_COLOR_MAP[updateType];
}


export const getDifficultyColors = (difficulty: AchievementDifficulty | "total" | undefined, variant: "text" | "border" | "ring" | "bg" = "text") => {
    if (!difficulty) return "";
    return DIFFICULTY_COLORS[`${variant}-${difficulty}`];
};
