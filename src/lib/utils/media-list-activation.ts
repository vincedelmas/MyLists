import {MediaType} from "@/lib/utils/enums";


/**
 * Activated media lists are a presentation preference: inactive lists are
 * omitted from the normal UI as if empty, while their retained data is not an
 * authorization boundary.
 */
export type MediaListActivationSetting = {
    active: boolean;
    mediaType: MediaType;
};


export const getActiveMediaSettings = <T extends MediaListActivationSetting>(settings?: readonly T[] | null) => {
    return settings?.filter(({ active }) => active) ?? [];
};


export const getActiveMediaTypes = (settings?: readonly MediaListActivationSetting[] | null) => {
    return getActiveMediaSettings(settings).map(({ mediaType }) => mediaType);
};


export const resolveMediaTypeActive = (settings: readonly MediaListActivationSetting[] | null | undefined, mediaType: MediaType) => {
    return settings?.some((setting) => setting.mediaType === mediaType && setting.active) ?? false;
};
