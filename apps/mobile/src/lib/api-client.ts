import {backendUrl} from "./config";
import {authClient} from "./auth-client";
import type * as Media from "../../../../src/lib/server/mobile/media";
import {timeNavigationRequest} from "./diagnostics/navigation-timing";
import type * as Social from "../../../../src/lib/server/mobile/social";
import type * as Library from "../../../../src/lib/server/mobile/library";
import type * as Profile from "../../../../src/lib/server/mobile/profile";
import type * as Settings from "../../../../src/lib/server/mobile/settings";
import type {searchCatalog} from "../../../../src/lib/server/domain/search/catalog-search";


// These references are erased by Metro. Payloads and mutation inputs are inferred
// from the backend implementation rather than maintained as parallel interfaces.
type Result<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

export type MediaType = MediaParams["mediaType"];
export type SearchResult = Result<typeof searchCatalog>;
export type MobileList = Result<typeof Media.getMobileList>;
export type MobileMedia = Result<typeof Media.getMobileMedia>;
export type SearchInput = Parameters<typeof searchCatalog>[0];
export type ListInput = Parameters<typeof Media.getMobileList>[2];
export type MediaParams = Parameters<typeof Media.getMobileMedia>[1];
export type UpdateInput = Parameters<typeof Media.updateMobileMedia>[1];
export type SettingsInput = Parameters<typeof Settings.saveMobileSettings>[1];
export type MobileProfile = NonNullable<Result<typeof Profile.getMobileProfile>>;
export type MobileProfileActivity = Result<typeof Profile.getMobileProfileActivity>;
export type MobileSettings = NonNullable<Result<typeof Settings.getMobileSettings>>;

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

const mediaPath = ({ mediaType, mediaId }: MediaParams) => `/media/${mediaType}/${mediaId}`;


const request = async <T>(path: string, signal?: AbortSignal, method = "GET", body?: unknown, timeoutMs = 15_000): Promise<T> => {
    let outcome = "failed-or-aborted";
    const finishTiming = timeNavigationRequest(path);

    try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const response = await fetch(`${backendUrl}/api/mobile/v1${path}`, {
            method,
            credentials: "omit",
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
            headers: {
                accept: "application/json",
                cookie: await authClient.getCookie(),
                ...(method !== "GET" ? { "content-type": "application/json" } : {}),
            },
        });

        outcome = `http-${response.status}`;
        if (!response.ok) {
            if (response.status === 401) {
                authClient.$store.notify("$sessionSignal");
            }

            const { error } = (await response.json()) as { error: { message: string } };
            throw new ApiError(response.status, error.message);
        }

        return await response.json();
    }
    finally {
        finishTiming?.(outcome);
    }
};


const queryString = (input: object) => {
    return new URLSearchParams(
        Object.entries(input)
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([key, value]) => [key, String(value)]),
    ).toString();
}


export const api = {
    profile: (signal?: AbortSignal) =>
        request<MobileProfile>("/profile", signal),
    profileActivity: (signal?: AbortSignal) =>
        request<MobileProfileActivity>("/profile/activity", signal),
    history: (page: number, signal?: AbortSignal) =>
        request<Result<typeof Profile.getMobileHistory>>(`/profile/history?page=${page}`, signal),
    stats: (tab: Parameters<typeof Profile.getMobileStats>[1], signal?: AbortSignal) =>
        request<Result<typeof Profile.getMobileStats>>(`/profile/stats?tab=${tab}`, signal),
    profileExtras: (signal?: AbortSignal) =>
        request<Result<typeof Profile.getMobileProfileExtras>>("/profile/extras", signal),
    social: (input: Parameters<typeof Social.getMobileSocial>[1], signal?: AbortSignal) =>
        request<Result<typeof Social.getMobileSocial>>(`/social?${queryString(input)}`, signal),
    socialAction: (input: Parameters<typeof Social.actOnMobileSocial>[1]) =>
        request<Result<typeof Social.actOnMobileSocial>>("/social", undefined, "POST", input),
    library: (input: Parameters<typeof Library.getMobileLibrary>[1], signal?: AbortSignal) =>
        request<Result<typeof Library.getMobileLibrary>>(`/library?${queryString(input)}`, signal),
    libraryDetail: (input: Parameters<typeof Library.getMobileLibraryDetail>[1], signal?: AbortSignal) =>
        request<Result<typeof Library.getMobileLibraryDetail>>(`/library/detail?${queryString(input)}`, signal),
    achievements: (signal?: AbortSignal) =>
        request<Result<typeof Profile.getMobileAchievements>>("/profile/achievements", signal),
    lists: (signal?: AbortSignal) =>
        request<NonNullable<Result<typeof Media.getMobileLists>>>("/lists", signal),
    list: (mediaType: MediaType, input: ListInput, signal?: AbortSignal) =>
        request<MobileList>(`/lists/${mediaType}?${queryString(input)}`, signal),
    media: (params: MediaParams, signal?: AbortSignal) =>
        request<MobileMedia>(mediaPath(params), signal),
    addMedia: (params: MediaParams, status?: string) =>
        request<Result<typeof Media.addMobileMedia>>(mediaPath(params), undefined, "POST", { status }),
    updateMedia: ({ mediaType, mediaId, ...input }: UpdateInput) =>
        request<Result<typeof Media.updateMobileMedia>>(mediaPath({ mediaType, mediaId }), undefined, "PATCH", input),
    removeMedia: (params: MediaParams) =>
        request<Result<typeof Media.removeMobileMedia>>(mediaPath(params), undefined, "DELETE"),
    search: (input: Omit<SearchInput, "advancedFilters">, signal?: AbortSignal) =>
        request<SearchResult>(`/search?${queryString(input)}`, signal),
    resolve: (mediaType: MediaType, apiId: string | number) =>
        request<{ mediaId: number }>("/resolve", undefined, "POST", { mediaType, apiId: String(apiId) }, 45_000),
    settings: (signal?: AbortSignal) =>
        request<MobileSettings>("/settings", signal),
    saveSettings: (input: SettingsInput) =>
        request<Result<typeof Settings.saveMobileSettings>>("/settings", undefined, "PATCH", input),
};


export const assetUrl = (path: string) => new URL(path, backendUrl).href;
