import type {MediaType} from "@/lib/utils/enums";


type MediadleMedia = {
    name: string;
    imageCover: string;
};


type MediadleSuggestion = {
    id: number;
    name: string;
};


type MediadleMediaService = {
    getPopularMediaRefs(): Promise<{ id: number }[]>;
    findById(mediaId: number): Promise<MediadleMedia | undefined>;
    searchMediadleSuggestion(query: string): Promise<MediadleSuggestion[]>;
};


type MediadleCatalogOptions<TMediaType extends MediaType> = {
    mediaType: TMediaType;
    mediaService: MediadleMediaService;
};


export const defineMediadleCatalog = <TMediaType extends MediaType>({ mediaType, mediaService }: MediadleCatalogOptions<TMediaType>) => {
    return {
        mediaType,

        async findById(mediaId: number) {
            return mediaService.findById(mediaId);
        },

        async searchSuggestions(query: string) {
            return mediaService.searchMediadleSuggestion(query);
        },

        async findDailyCandidateId(excludedMediaIds: number[]) {
            const excludedIds = new Set(excludedMediaIds);

            const candidates = await mediaService
                .getPopularMediaRefs()
                .then((mediaRefs) => mediaRefs.filter(({ id }) => !excludedIds.has(id)));

            return candidates[Math.floor(Math.random() * candidates.length)]?.id;
        },
    };
};


export type MediadleCatalog = ReturnType<typeof defineMediadleCatalog>;


export const createMediadleCatalogRegistry = (catalogs: Partial<Record<MediaType, MediadleCatalog>>) => {
    const immutableCatalogs = Object.freeze({ ...catalogs });

    return Object.freeze({
        get(mediaType: MediaType) {
            const catalog = immutableCatalogs[mediaType];
            if (!catalog) throw new Error(`Mediadle is not configured for media type: ${mediaType}`);
            return catalog;
        },
    });
};


export type MediadleCatalogRegistry = ReturnType<typeof createMediadleCatalogRegistry>;
