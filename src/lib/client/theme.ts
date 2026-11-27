import {LayoutGrid} from "lucide-react";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {getMediaTheme, MEDIA_THEME_COLORS} from "@/lib/client/components/media/media-theme";


type ThemeColorKey = MediaType | Status | "all" | "brand" | "overview";


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
    [UpdateType.ACHIEVEMENTS]: "var(--games)",
};


export const getThemeColor = (type: ThemeColorKey | undefined) => {
    if (!type) return "var(--muted-foreground)";
    return THEME_COLOR_MAP[type];
}


export const getUpdateTypeColor = (updateType: UpdateType) => {
    return UPDATE_TYPE_COLOR_MAP[updateType];
}
