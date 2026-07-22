import {MediaType} from "@/lib/utils/enums";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {UserProfileRepository} from "@/lib/server/domain/user/user-profile.repository";
import {
    createDefaultHighlightedMediaSettings,
    HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    HighlightedMediaRef,
    HighlightedMediaResolvedItem,
    HighlightedMediaResolvedSettings,
    HighlightedMediaSearchItem,
    HighlightedMediaSettings,
    HighlightedMediaTab,
    PROFILE_MAX_HIGHLIGHTED_MEDIA,
} from "@/lib/types/profile-custom.types";


export class UserProfileService {
    constructor(
        private repository: typeof UserProfileRepository,
        private mediaServiceRegistry: MediaServiceRegistry,
    ) {
    }

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
        const settings = await this.getHighlightedMediaSettings(userId);

        const mediaTypes = Object.values(MediaType);
        const activeMediaTypes = new Set(await this.repository.getActiveMediaTypes(userId));
        const overviewPool: HighlightedMediaResolvedItem[] = [];
        const resolvedTabs: Partial<HighlightedMediaResolvedSettings> = {};

        // Resolve specific tabs while building overview pool
        await Promise.all(mediaTypes.map(async (mediaType) => {
            const tabConfig = settings[mediaType];
            let tabItems: HighlightedMediaResolvedItem[] = [];
            let poolItems: HighlightedMediaResolvedItem[] = [];

            if (!activeMediaTypes.has(mediaType)) {
                resolvedTabs[mediaType] = { ...tabConfig, items: [] };
                return;
            }

            if (tabConfig.mode === "curated") {
                tabItems = await this._resolveCuratedItems(mediaType, tabConfig.items, userId);
                poolItems = tabItems;
            }
            else {
                const needsRandomForTab = (tabConfig.mode === "random");
                const needsRandomForOverview = (tabConfig.mode === "disabled" && settings.overview.mode === "random");

                if (needsRandomForTab || needsRandomForOverview) {
                    const mediaService = this.mediaServiceRegistry.get(mediaType);
                    const favorites = await mediaService.getUserFavorites(userId, 3 * PROFILE_MAX_HIGHLIGHTED_MEDIA);
                    const mapFavorites = favorites.map((fav) => ({
                        ...fav,
                        mediaType,
                        mediaCover: fav.customCover ?? fav.mediaCover,
                    }));

                    poolItems = mapFavorites;
                    if (needsRandomForTab) tabItems = mapFavorites;
                }
            }

            overviewPool.push(...poolItems);
            resolvedTabs[mediaType] = { ...tabConfig, items: tabItems };
        }));

        // Resolve Overview tab
        const overviewConfig = settings.overview;
        let overviewItems: HighlightedMediaResolvedItem[] = [];

        if (overviewConfig.mode === "random") {
            overviewItems = this._shuffle(overviewPool).slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA);
        }
        else if (overviewConfig.mode === "curated") {
            const activeItems = overviewConfig.items.filter((item) => activeMediaTypes.has(item.mediaType));
            overviewItems = await this._resolveCuratedItems("overview", activeItems, userId);
        }

        return {
            overview: {
                ...overviewConfig,
                items: overviewItems,
            },
            ...resolvedTabs,
        } as HighlightedMediaResolvedSettings;
    }

    async searchHighlightedMedia(userId: number, tab: HighlightedMediaTab, query: string): Promise<HighlightedMediaSearchItem[]> {
        const perTypeLimit = tab === "overview" ? 4 : 10;
        const targetMediaTypes = tab === "overview" ? Object.values(MediaType) : [tab];

        const results = await Promise.all(targetMediaTypes.map(async (mediaType) => {
            const mediaService = this.mediaServiceRegistry.get(mediaType);
            const mediaDetails = await mediaService.searchUserListByName(userId, query, perTypeLimit);
            return mediaDetails.map((media) => ({
                ...media,
                mediaType,
                mediaCover: media.customCover ?? media.mediaCover,
            }));
        }));

        return results
            .flat()
            .sort((a, b) => a.mediaName.localeCompare(b.mediaName))
            .slice(0, 10);
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

    private async _resolveCuratedItems(tab: HighlightedMediaTab, items: HighlightedMediaRef[], userId: number): Promise<HighlightedMediaResolvedItem[]> {
        if (items.length === 0) return [];

        const groupedByMediaType = items.reduce((acc, item) => {
            if (tab !== "overview" && item.mediaType !== tab) return acc;
            acc[item.mediaType] = acc[item.mediaType] || [];
            acc[item.mediaType].push(item.mediaId);
            return acc;
        }, {} as Record<string, number[]>);

        const lookupMap = new Map<string, Omit<HighlightedMediaResolvedItem, "mediaType">>();

        await Promise.all(Object.entries(groupedByMediaType).map(async ([mediaType, mediaIds]) => {
            const mediaService = this.mediaServiceRegistry.get(mediaType as MediaType);
            const mediaDetails = await mediaService.getMediaDetailsByIds(mediaIds, userId);
            for (const md of mediaDetails) {
                lookupMap.set(`${mediaType}|${md.id}`, {
                    mediaId: md.id,
                    mediaName: md.name,
                    mediaCover: md.customCover ?? md.imageCover,
                });
            }
        }));

        return items
            .map((item) => {
                const mediaDetails = lookupMap.get(`${item.mediaType}|${item.mediaId}`);
                return mediaDetails ? { ...mediaDetails, mediaType: item.mediaType } : null;
            })
            .filter((item): item is HighlightedMediaResolvedItem => item !== null)
            .slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA);
    }

    private _shuffle<T>(items: T[]) {
        const next = [...items];
        for (let i = next.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
    }
}
