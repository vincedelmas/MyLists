import {MediaType} from "@/lib/utils/enums";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import type {ProfileRepository} from "@/lib/server/domain/profile/profile.repository";
import {
    createDefaultHighlightedMediaSettings,
    HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    type HighlightedMediaRef,
    type HighlightedMediaResolvedItem,
    type HighlightedMediaResolvedSettings,
    type HighlightedMediaSearchItem,
    type HighlightedMediaSettings,
    type HighlightedMediaTab,
    PROFILE_MAX_HIGHLIGHTED_MEDIA,
} from "@/lib/types/profile-custom.types";


export const createProfileService = (repository: ProfileRepository, mediaServiceRegistry: MediaServiceRegistry) => {
    const resolveSettingsDefaults = (settings?: HighlightedMediaSettings): HighlightedMediaSettings => {
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
    };

    const resolveCuratedItems = async (tab: HighlightedMediaTab, items: HighlightedMediaRef[], userId: number): Promise<HighlightedMediaResolvedItem[]> => {
        if (items.length === 0) return [];

        const groupedByMediaType = items.reduce((acc, item) => {
            if (tab !== "overview" && item.mediaType !== tab) return acc;
            acc[item.mediaType] = acc[item.mediaType] || [];
            acc[item.mediaType].push(item.mediaId);
            return acc;
        }, {} as Record<string, number[]>);

        const lookupMap = new Map<string, Omit<HighlightedMediaResolvedItem, "mediaType">>();

        await Promise.all(Object.entries(groupedByMediaType).map(async ([mediaType, mediaIds]) => {
            const mediaService = mediaServiceRegistry.get(mediaType as MediaType);
            const mediaDetails = await mediaService.getMediaDetailsByIds(mediaIds, userId);
            for (const media of mediaDetails) {
                lookupMap.set(`${mediaType}|${media.id}`, {
                    mediaId: media.id,
                    mediaName: media.name,
                    releaseDate: media.releaseDate,
                    mediaCover: media.customCover ?? media.imageCover,
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
    };

    const shuffle = <T>(items: T[]) => {
        const next = [...items];
        for (let index = next.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
        }
        return next;
    };

    const service = {
        async getRandomPublicProfile() {
            return repository.getRandomPublicProfile();
        },

        async incrementProfileView(userId: number) {
            return repository.incrementProfileView(userId);
        },

        async incrementMediaTypeView(userId: number, mediaType: MediaType) {
            return repository.incrementMediaTypeView(userId, mediaType);
        },

        async searchUsers(query: string, page = 1, currentUserId?: number) {
            return repository.searchUsers(query, page, currentUserId);
        },

        async getProfileImageFilenames() {
            const results = await repository.getProfileImageFilenames();
            return results.map(({ image }) => image?.split("/").pop() as string);
        },

        async getBackgroundImageFilenames() {
            const results = await repository.getBackgroundImageFilenames();
            return results.map(({ backgroundImage }) => backgroundImage.split("/").pop() as string);
        },

        async getHighlightedMediaSettings(userId: number) {
            const savedSettings = await repository.getHighlightedMediaSettings(userId);
            return resolveSettingsDefaults(savedSettings);
        },

        async saveHighlightedMediaSettings(userId: number, settings: HighlightedMediaSettings) {
            const normalizedSettings = resolveSettingsDefaults(settings);
            await repository.upsertHighlightedMediaSettings(userId, normalizedSettings);

            return normalizedSettings;
        },

        async resolveHighlightedMedia(userId: number) {
            const settings = await service.getHighlightedMediaSettings(userId);

            const mediaTypes = Object.values(MediaType);
            const activeMediaTypes = new Set(await repository.getActiveMediaTypes(userId));
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
                    tabItems = await resolveCuratedItems(mediaType, tabConfig.items, userId);
                    poolItems = tabItems;
                }
                else {
                    const needsRandomForTab = tabConfig.mode === "random";
                    const needsRandomForOverview = tabConfig.mode === "disabled" && settings.overview.mode === "random";

                    if (needsRandomForTab || needsRandomForOverview) {
                        const mediaService = mediaServiceRegistry.get(mediaType);
                        const favorites = await mediaService.getUserFavorites(userId, 3 * PROFILE_MAX_HIGHLIGHTED_MEDIA);
                        const mapFavorites = favorites.map((favorite) => ({
                            ...favorite,
                            mediaType,
                            mediaCover: favorite.customCover ?? favorite.mediaCover,
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
                overviewItems = shuffle(overviewPool).slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA);
            }
            else if (overviewConfig.mode === "curated") {
                const activeItems = overviewConfig.items.filter((item) => activeMediaTypes.has(item.mediaType));
                overviewItems = await resolveCuratedItems("overview", activeItems, userId);
            }

            return {
                overview: {
                    ...overviewConfig,
                    items: overviewItems,
                },
                ...resolvedTabs,
            } as HighlightedMediaResolvedSettings;
        },

        async searchHighlightedMedia(userId: number, tab: HighlightedMediaTab, query: string): Promise<HighlightedMediaSearchItem[]> {
            const perTypeLimit = tab === "overview" ? 4 : 10;
            const targetMediaTypes = tab === "overview" ? Object.values(MediaType) : [tab];

            const results = await Promise.all(targetMediaTypes.map(async (mediaType) => {
                const mediaService = mediaServiceRegistry.get(mediaType);
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
        },
    };

    return service;
};


export type ProfileService = ReturnType<typeof createProfileService>;
