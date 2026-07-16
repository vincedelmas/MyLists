import {UserProfileRepository} from "@/lib/server/domain/user/user-profile.repository";
import {
    createDefaultHighlightedMediaSettings,
    HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    HighlightedMediaRef,
    HighlightedMediaSearchItem,
    HighlightedMediaSettings,
    HighlightedMediaTab,
    PROFILE_MAX_HIGHLIGHTED_MEDIA,
} from "@/lib/types/profile-custom.types";
import {ProfileHighlightsReadService} from "@/lib/server/domain/profile/profile-highlights-read.service";


export class UserProfileService {
    private readonly highlights = new ProfileHighlightsReadService();

    constructor(private repository: typeof UserProfileRepository) {}

    async getHighlightedMediaSettings(userId: number) {
        const savedSettings = await this.repository.getHighlightedMediaSettings(userId);
        return this._resolveSettingsDefaults(savedSettings);
    }

    async saveHighlightedMediaSettings(userId: number, settings: HighlightedMediaSettings) {
        const normalizedSettings = this._resolveSettingsDefaults(settings);
        await this.repository.upsertHighlightedMediaSettings(userId, normalizedSettings);

        return normalizedSettings;
    }

    async resolveHighlightedMedia(userId: number) {
        return this.highlights.resolveHighlightedMedia(userId);
    }

    async searchHighlightedMedia(userId: number, tab: HighlightedMediaTab, query: string): Promise<HighlightedMediaSearchItem[]> {
        return this.highlights.searchHighlightedMedia(userId, tab, query);
    }

    private _resolveSettingsDefaults(settings?: HighlightedMediaSettings): HighlightedMediaSettings {
        const defaultSettings = createDefaultHighlightedMediaSettings();

        return Object.entries(defaultSettings).reduce((acc, [tab]) => {
            const typedTab = tab as HighlightedMediaTab;
            const userTab = settings?.[typedTab];

            acc[typedTab] = {
                mode: userTab?.mode || "random",
                title: userTab?.title.trim() || HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
                items: (userTab?.items || [])
                    .filter((item: HighlightedMediaRef) => typedTab === "overview" || item.mediaType === typedTab)
                    .slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA),
            };

            return acc;
        }, {} as HighlightedMediaSettings);
    }

}
