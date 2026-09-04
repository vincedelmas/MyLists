import type {MediaType} from "@/lib/utils/enums";
import {WCF_MEDIA_TYPES} from "@/lib/schemas/wcf.schema";


type WcfMedia = {
    name: string;
    imageCover: string;
};


type WcfMediaRef = {
    id: number;
    releaseDate: string;
};


type WcfMediaService = {
    getPopularMediaRefs(): Promise<WcfMediaRef[]>;
    findById(mediaId: number): Promise<WcfMedia | undefined>;
};


type WcfCatalogOptions<TMediaType extends MediaType> = {
    mediaType: TMediaType;
    mediaService: WcfMediaService;
};


export const defineWcfCatalog = <TMediaType extends MediaType>({ mediaType, mediaService }: WcfCatalogOptions<TMediaType>) => {
    return {
        mediaType,

        async getPopularMediaRefs() {
            return mediaService.getPopularMediaRefs();
        },

        async findById(mediaId: number) {
            return mediaService.findById(mediaId);
        },
    };
};


type WcfMediaType = typeof WCF_MEDIA_TYPES[number];
export type WcfCatalog = ReturnType<typeof defineWcfCatalog>;


export const createWcfCatalogRegistry = (catalogs: Record<WcfMediaType, WcfCatalog>) => {
    const immutableCatalogs = Object.freeze({ ...catalogs });
    const catalogEntries = Object.freeze(WCF_MEDIA_TYPES.map((mediaType) => immutableCatalogs[mediaType]));

    return Object.freeze({
        catalogs: catalogEntries,

        get(mediaType: MediaType) {
            const catalog = immutableCatalogs[mediaType as WcfMediaType];
            if (!catalog) throw new Error(`Which Came First is not configured for media type: ${mediaType}`);
            return catalog;
        },
    });
};


export type WcfCatalogRegistry = ReturnType<typeof createWcfCatalogRegistry>;
