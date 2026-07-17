import {MEDIA_TYPES, MediaType} from "@/lib/utils/enums";
import {UserProfileRepository} from "@/lib/server/domain/user/user-profile.repository";
import {ProfileHighlightsRepository} from "@/lib/server/domain/profile/profile-highlights.repository";
import {
    HighlightedMediaRef,
    HighlightedMediaResolvedItem,
    HighlightedMediaResolvedSettings,
    HighlightedMediaSearchItem,
    HighlightedMediaTab,
    PROFILE_MAX_HIGHLIGHTED_MEDIA,
} from "@/lib/types/profile-custom.types";
import {normalizeHighlightedMediaSettings} from "@/lib/server/domain/profile/profile-customization.settings";


export class ProfileHighlightsQuery {
    constructor(
        private readonly repository = ProfileHighlightsRepository,
        private readonly settingsRepository = UserProfileRepository,
        private readonly random: () => number = Math.random,
    ) {
    }

    async resolveHighlightedMedia(userId: number) {
        const mediaTypes = MEDIA_TYPES;
        const settings = normalizeHighlightedMediaSettings(await this.settingsRepository.getHighlightedMediaSettings(userId));
        const activeMediaTypes = new Set(await this.repository.getActiveMediaTypes(userId));
        const overviewPool: HighlightedMediaResolvedItem[] = [];
        const resolvedTabs: Partial<HighlightedMediaResolvedSettings> = {};

        await Promise.all(mediaTypes.map(async (mediaType) => {
            const tabConfig = settings[mediaType];
            let tabItems: HighlightedMediaResolvedItem[] = [];
            let poolItems: HighlightedMediaResolvedItem[] = [];
            if (!activeMediaTypes.has(mediaType)) {
                resolvedTabs[mediaType] = { ...tabConfig, items: [] };
                return;
            }
            if (tabConfig.mode === "curated") {
                tabItems = await this.resolveCuratedItems(mediaType, tabConfig.items, userId);
                poolItems = tabItems;
            }
            else {
                const needsRandomForTab = tabConfig.mode === "random";
                const needsRandomForOverview = tabConfig.mode === "disabled" && settings.overview.mode === "random";
                if (needsRandomForTab || needsRandomForOverview) {
                    poolItems = (await this.repository.getUserFavorites(
                        userId,
                        mediaType,
                        3 * PROFILE_MAX_HIGHLIGHTED_MEDIA,
                    )).map((favorite) => ({
                        ...favorite,
                        mediaType,
                        mediaCover: favorite.customCover ?? favorite.mediaCover,
                    }));
                    if (needsRandomForTab) tabItems = poolItems;
                }
            }
            overviewPool.push(...poolItems);
            resolvedTabs[mediaType] = { ...tabConfig, items: tabItems };
        }));

        const overviewConfig = settings.overview;
        let overviewItems: HighlightedMediaResolvedItem[] = [];
        if (overviewConfig.mode === "random") {
            overviewItems = this.shuffle(overviewPool).slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA);
        }
        else if (overviewConfig.mode === "curated") {
            overviewItems = await this.resolveCuratedItems(
                "overview",
                overviewConfig.items.filter((item) => activeMediaTypes.has(item.mediaType)),
                userId,
            );
        }

        return {
            overview: { ...overviewConfig, items: overviewItems },
            ...resolvedTabs,
        } as HighlightedMediaResolvedSettings;
    }

    async searchHighlightedMedia(
        userId: number,
        tab: HighlightedMediaTab,
        query: string,
    ): Promise<HighlightedMediaSearchItem[]> {
        const perTypeLimit = tab === "overview" ? 4 : 10;
        const targetMediaTypes = tab === "overview" ? MEDIA_TYPES : [tab];
        const results = await Promise.all(targetMediaTypes.map(async (mediaType) =>
            (await this.repository.searchUserListByName(userId, mediaType, query, perTypeLimit)).map((media) => ({
                ...media,
                mediaType,
                mediaCover: media.customCover ?? media.mediaCover,
            })),
        ));
        return results.flat()
            .sort((left, right) => left.mediaName.localeCompare(right.mediaName))
            .slice(0, 10);
    }

    private async resolveCuratedItems(
        tab: HighlightedMediaTab,
        items: HighlightedMediaRef[],
        userId: number,
    ): Promise<HighlightedMediaResolvedItem[]> {
        if (items.length === 0) return [];
        const grouped = items.reduce((result, item) => {
            if (tab !== "overview" && item.mediaType !== tab) return result;
            (result[item.mediaType] ??= []).push(item.mediaId);
            return result;
        }, {} as Partial<Record<MediaType, number[]>>);
        const lookup = new Map<string, Omit<HighlightedMediaResolvedItem, "mediaType">>();
        await Promise.all(Object.entries(grouped).map(async ([mediaType, mediaIds]) => {
            const kind = mediaType as MediaType;
            for (const media of await this.repository.getMediaDetailsByIds(userId, kind, mediaIds)) {
                lookup.set(`${kind}|${media.id}`, {
                    mediaId: media.id,
                    mediaName: media.name,
                    mediaCover: media.customCover ?? media.imageCover,
                });
            }
        }));
        return items.map((item) => {
            const media = lookup.get(`${item.mediaType}|${item.mediaId}`);
            return media ? { ...media, mediaType: item.mediaType } : null;
        }).filter((item): item is HighlightedMediaResolvedItem => item !== null)
            .slice(0, PROFILE_MAX_HIGHLIGHTED_MEDIA);
    }

    private shuffle<T>(items: T[]) {
        const next = [...items];
        for (let index = next.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(this.random() * (index + 1));
            [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        }
        return next;
    }
}
