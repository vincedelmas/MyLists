import {MediaType} from "@/lib/utils/enums";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";


export type ProfileCustomKey = "highlightedMedia";
export type HighlightedMediaTab = "overview" | MediaType;
type HighlightedMediaMode = "random" | "curated" | "disabled";

export const PROFILE_MAX_HIGHLIGHTED_MEDIA = 7;

export const HIGHLIGHTED_MEDIA_DEFAULT_TITLE = "Highlighted Media";

export const HIGHLIGHTED_MEDIA_TABS = ["overview", ...ALL_MEDIA_TYPES] as const;


export interface HighlightedMediaRef {
    mediaId: number;
    mediaType: MediaType;
}


export interface HighlightedMediaResolvedItem extends HighlightedMediaRef {
    mediaName: string;
    mediaCover: string;
    releaseDate: string | null;
}


interface BaseHighlightedMediaTabConfig<T> {
    items: T[];
    title: string;
    mode: HighlightedMediaMode;
}


export type HighlightedMediaTabConfig = BaseHighlightedMediaTabConfig<HighlightedMediaRef>;
export type ResolvedHighlightedMediaTabConfig = BaseHighlightedMediaTabConfig<HighlightedMediaResolvedItem>;
export type HighlightedMediaSettings = Record<HighlightedMediaTab, HighlightedMediaTabConfig>;
export type HighlightedMediaResolvedSettings = Record<HighlightedMediaTab, ResolvedHighlightedMediaTabConfig>;
export type HighlightedMediaSearchItem = HighlightedMediaResolvedItem;


export const createDefaultHighlightedMediaSettings = (): HighlightedMediaSettings => {
    return HIGHLIGHTED_MEDIA_TABS.reduce((acc, tab) => {
        acc[tab] = {
            items: [],
            mode: "random",
            title: HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
        };
        return acc;
    }, {} as HighlightedMediaSettings);
};
