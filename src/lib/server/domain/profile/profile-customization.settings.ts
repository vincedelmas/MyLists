import {
    createDefaultHighlightedMediaSettings,
    HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    HighlightedMediaRef,
    HighlightedMediaSettings,
    HighlightedMediaTab,
    PROFILE_MAX_HIGHLIGHTED_MEDIA,
} from "@/lib/types/profile-custom.types";


export const normalizeHighlightedMediaSettings = (settings?: HighlightedMediaSettings): HighlightedMediaSettings => {
    const defaults = createDefaultHighlightedMediaSettings();
    return Object.entries(defaults).reduce((resolved, [tab]) => {
        const typedTab = tab as HighlightedMediaTab;
        const saved = settings?.[typedTab];
        resolved[typedTab] = {
            mode: saved?.mode || "random",
            title: saved?.title.trim() || HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
            items: (saved?.items || [])
                .filter((item: HighlightedMediaRef) => typedTab === "overview" || item.mediaType === typedTab)
                .slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA),
        };
        return resolved;
    }, {} as HighlightedMediaSettings);
};
