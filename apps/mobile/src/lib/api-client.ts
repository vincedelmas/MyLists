import type * as Moviedle from "../../../../src/lib/server/mobile/moviedle";
import {backendUrl} from "./config";
import {authClient} from "./auth-client";
import type * as ListFilters from "../../../../src/lib/server/mobile/list-filters";
import type * as Notifications from "../../../../src/lib/server/mobile/notifications";
import type * as MediaSections from "../../../../src/lib/server/mobile/media-sections";
import type * as Media from "../../../../src/lib/server/mobile/media";
import {timeNavigationRequest} from "./diagnostics/navigation-timing";
import type * as Social from "../../../../src/lib/server/mobile/social";
import type * as Library from "../../../../src/lib/server/mobile/library";
import type * as Calendar from "../../../../src/lib/server/mobile/calendar";
import type * as People from "../../../../src/lib/server/mobile/people";
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
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

const mediaPath = ({ mediaType, mediaId }: MediaParams) => `/media/${mediaType}/${mediaId}`;

const request = async <T>(
    path: string,
    signal?: AbortSignal,
    method = "GET",
    body?: unknown,
    timeoutMs = 15_000,
): Promise<T> => {
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
};

const subjectPath = (path: string, userId?: number) =>
    userId === undefined ? path : `${path}?${queryString({ userId })}`;

export const api = {
    moviedle: (signal?: AbortSignal) => request<Result<typeof Moviedle.getMobileMoviedle>>("/moviedle", signal),
    moviedleSuggestions: (query: string, signal?: AbortSignal) => request<Result<typeof Moviedle.getMobileMoviedleSuggestions>>(`/moviedle/suggestions?${queryString({ query })}`, signal),
    moviedleLeaderboard: (signal?: AbortSignal) => request<Result<typeof Moviedle.getMobileMoviedleLeaderboard>>("/moviedle/leaderboard", signal),
    moviedleGuess: (input: Parameters<typeof Moviedle.guessMobileMoviedle>[1]) => request<Result<typeof Moviedle.guessMobileMoviedle>>("/moviedle", undefined, "POST", input),
    notificationCounts: (signal?: AbortSignal) =>
        request<Result<typeof Notifications.getMobileNotificationCounts>>("/notifications/counts", signal),
    notifications: (type: Parameters<typeof Notifications.getMobileNotifications>[1], signal?: AbortSignal) =>
        request<Result<typeof Notifications.getMobileNotifications>>(`/notifications?type=${type}`, signal),
    notificationAction: (input: Parameters<typeof Notifications.actOnMobileNotification>[1]) =>
        request<Result<typeof Notifications.actOnMobileNotification>>("/notifications", undefined, "POST", input),
    listFilters: (mediaType: MediaType, signal?: AbortSignal, userId?: number) =>
        request<Result<typeof ListFilters.getMobileListFilterOptions>>(
            `/lists/${mediaType}/filters?${queryString({ userId })}`,
            signal,
        ),
    searchListFilters: (
        mediaType: MediaType,
        field: Parameters<typeof ListFilters.searchMobileListFilterOptions>[2],
        query: string,
        signal?: AbortSignal,
        userId?: number,
    ) =>
        request<Result<typeof ListFilters.searchMobileListFilterOptions>>(
            `/lists/${mediaType}/filter-search?${queryString({ field, query, userId })}`,
            signal,
        ),
    mediaDetails: (params: MediaParams, signal?: AbortSignal) =>
        request<Result<typeof MediaSections.getMobileMediaDetails>>(`${mediaPath(params)}/details`, signal),
    mediaCommunity: (params: MediaParams, page: number, signal?: AbortSignal) =>
        request<Result<typeof MediaSections.getMobileMediaCommunity>>(
            `${mediaPath(params)}/community?page=${page}`,
            signal,
        ),
    mediaCollections: (params: MediaParams, signal?: AbortSignal) =>
        request<Result<typeof MediaSections.getMobileMediaCollections>>(`${mediaPath(params)}/collections`, signal),
    mediaEdit: (params: MediaParams, signal?: AbortSignal) =>
        request<Result<typeof MediaSections.getMobileMediaEdit>>(`${mediaPath(params)}/edit`, signal),
    saveMediaEdit: (input: Parameters<typeof MediaSections.saveMobileMediaEdit>[1]) =>
        request<Result<typeof MediaSections.saveMobileMediaEdit>>(`${mediaPath(input)}/edit`, undefined, "POST", {
            payload: input.payload,
        }),
    refreshMedia: (params: MediaParams) =>
        request<Result<typeof MediaSections.refreshMobileMedia>>(
            `${mediaPath(params)}/refresh`,
            undefined,
            "POST",
            {},
            60_000,
        ),
    calendar: (range: Parameters<typeof Calendar.getMobileCalendar>[1], signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Calendar.getMobileCalendar>>(
            `/profile/calendar?${queryString({ ...range, userId })}`,
            signal,
        ),
    person: (userId: number, signal?: AbortSignal) =>
        request<NonNullable<Result<typeof People.getMobilePerson>>>(`/people/${userId}`, signal),
    profile: (signal?: AbortSignal, userId?: number) => request<MobileProfile>(subjectPath("/profile", userId), signal),
    profileActivity: (signal?: AbortSignal, userId?: number) =>
        request<MobileProfileActivity>(subjectPath("/profile/activity", userId), signal),
    history: (page: number, signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Profile.getMobileHistory>>(`/profile/history?${queryString({ page, userId })}`, signal),
    stats: (tab: Parameters<typeof Profile.getMobileStats>[1], signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Profile.getMobileStats>>(`/profile/stats?${queryString({ tab, userId })}`, signal),
    profileExtras: (signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Profile.getMobileProfileExtras>>(subjectPath("/profile/extras", userId), signal),
    social: (input: Parameters<typeof Social.getMobileSocial>[1], signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Social.getMobileSocial>>(`/social?${queryString({ ...input, userId })}`, signal),
    socialAction: (input: Parameters<typeof Social.actOnMobileSocial>[1]) =>
        request<Result<typeof Social.actOnMobileSocial>>("/social", undefined, "POST", input),
    library: (input: Parameters<typeof Library.getMobileLibrary>[1], signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Library.getMobileLibrary>>(`/library?${queryString({ ...input, userId })}`, signal),
    libraryDetail: (
        input: Parameters<typeof Library.getMobileLibraryDetail>[1],
        signal?: AbortSignal,
        userId?: number,
    ) =>
        request<Result<typeof Library.getMobileLibraryDetail>>(
            `/library/detail?${queryString({ ...input, userId })}`,
            signal,
        ),
    recentAchievements: (signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Profile.getMobileRecentAchievements>>(
            subjectPath("/profile/achievements/recent", userId),
            signal,
        ),
    achievements: (signal?: AbortSignal, userId?: number) =>
        request<Result<typeof Profile.getMobileAchievements>>(subjectPath("/profile/achievements", userId), signal),
    lists: (signal?: AbortSignal) => request<NonNullable<Result<typeof Media.getMobileLists>>>("/lists", signal),
    list: (mediaType: MediaType, input: ListInput, signal?: AbortSignal, userId?: number) =>
        request<MobileList>(`/lists/${mediaType}?${queryString({ filters: JSON.stringify(input), userId })}`, signal),
    media: (params: MediaParams, signal?: AbortSignal) => request<MobileMedia>(mediaPath(params), signal),
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
    settings: (signal?: AbortSignal) => request<MobileSettings>("/settings", signal),
    saveSettings: (input: SettingsInput) =>
        request<Result<typeof Settings.saveMobileSettings>>("/settings", undefined, "PATCH", input),
};

export const assetUrl = (path: string) => new URL(path, backendUrl).href;
