import {MediaType} from "@/lib/utils/enums";


/**
 * Activated media lists are a publication boundary. Their retained data stays
 * available to owner-only management flows, but profile/list reads and derived
 * public data must ignore inactive lists.
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


export const getPublishedMediaSettings = <T extends MediaListActivationSetting & { timeSpent: number }>(settings: readonly T[]) => {
    return settings.map((setting) => ({
        ...setting,
        timeSpent: setting.active ? setting.timeSpent : 0,
    }));
};


export const resolveMediaTypeActive = (settings: readonly MediaListActivationSetting[] | null | undefined, mediaType: MediaType) => {
    return settings?.some((setting) => setting.mediaType === mediaType && setting.active) ?? false;
};
