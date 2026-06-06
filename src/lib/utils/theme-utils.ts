import {AchievementDifficulty, MediaType, Status} from "@/lib/utils/enums";
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


const DIFFICULTY_COLORS: Record<string, string> = {
    "border-bronze": "border-amber-700",
    "border-silver": "border-slate-400",
    "border-gold": "border-yellow-600",
    "border-platinum": "border-teal-600",
    "bg-bronze": "bg-amber-700",
    "bg-silver": "bg-slate-400",
    "bg-gold": "bg-yellow-600",
    "bg-platinum": "bg-teal-600",
    "text-bronze": "text-amber-700",
    "text-silver": "text-slate-400",
    "text-gold": "text-yellow-600",
    "text-platinum": "text-teal-600",
};


export const getThemeColor = (type: MediaType | Status | string | undefined) => {
    if (!type) return "#CBCBCB";
    return THEME_COLOR_MAP[type] ?? "#CBCBCB";
};


export const diffColors = (difficulty: AchievementDifficulty | "total" | undefined, variant: "text" | "border" | "bg" = "text") => {
    if (!difficulty) return "";
    return DIFFICULTY_COLORS[`${variant}-${difficulty}`];
};
