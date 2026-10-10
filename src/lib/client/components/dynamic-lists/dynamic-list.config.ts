import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {MEDIA_SORT_FIELD_LABELS} from "@/lib/media-definitions/base/media-sorting";
import {BookOpen, Clock3, Heart, MessageSquare, Pause, Play, Sparkles, Star, StarOff, type LucideIcon} from "lucide-react";


export const DYNAMIC_LIST_STATUS_OPTIONS = [
    { value: "any", label: "Any status" },
    { value: "planned", label: "Plan to watch, play or read" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On hold" },
    { value: "dropped", label: "Dropped" },
] as const satisfies readonly { value: DynamicListSpec["filters"]["statusGroup"] | "any"; label: string }[];


export const DYNAMIC_LIST_SORT_OPTIONS = (["addedAt", "lastUpdated", "title", "rating", "releaseDate"] as const)
    .map((value: DynamicListSpec["sort"]["field"]) => ({
        value,
        label: MEDIA_SORT_FIELD_LABELS[value],
    })) satisfies readonly {
    label: string;
    value: DynamicListSpec["sort"]["field"];
}[];


export const DYNAMIC_LIST_PRESET_ICONS: Record<string, LucideIcon> = {
    "In progress": Play,
    "Finished and loved": Star,
    "Recently added": Sparkles,
    "Paused for a while": Pause,
    "Your reading queue": BookOpen,
    "Your favorites, together": Heart,
    "Waiting for your rating": StarOff,
    "Plans older than six months": Clock3,
    "Your notes and reviews": MessageSquare,
};
