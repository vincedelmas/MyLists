import {MediaType} from "@/lib/utils/enums";
import {adminOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";
import {
    achievementOptions,
    hallOfFameOptions,
    historyOptions,
    listFiltersOptions,
    mediaDetailsOptions,
    mediaListOptions,
    profileHeaderOptions,
    profileOptions,
    tasteMatchesOptions,
    upcomingOptions,
} from "@/lib/client/react-query/query-options";


// --- Inferred Query Options Types -----------------------------------------------------
export type HistoryOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof historyOptions>["queryFn"]>>>;
export type ProfileOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof profileOptions>["queryFn"]>>>;
export type ProfileHeaderOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof profileHeaderOptions>["queryFn"]>>>;
export type MediaListOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof mediaListOptions>["queryFn"]>>>;
export type ListFiltersOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof listFiltersOptions>["queryFn"]>>>;
export type MediaDetailsOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof mediaDetailsOptions>["queryFn"]>>>;
export type AchCard = Awaited<ReturnType<NonNullable<ReturnType<typeof achievementOptions>["queryFn"]>>>["result"][number];
export type AchSummary = Awaited<ReturnType<NonNullable<ReturnType<typeof achievementOptions>["queryFn"]>>>["summary"][MediaType];
export type HofUserData = Awaited<ReturnType<NonNullable<ReturnType<typeof hallOfFameOptions>["queryFn"]>>>["items"][number];
export type HofUserRank = Awaited<ReturnType<NonNullable<ReturnType<typeof hallOfFameOptions>["queryFn"]>>>["userRanks"];
export type TasteMatch = NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof tasteMatchesOptions>["queryFn"]>>>["featuredMatch"]>;
export type ComingNextItem = Awaited<ReturnType<NonNullable<typeof upcomingOptions.queryFn>>>[number]["items"][number];
export type AdminUserOverview = Awaited<ReturnType<NonNullable<typeof adminOverviewOptions.queryFn>>>["recentUsers"];


// --- User Media Details Types ----------------------------------------------------
export type UserMedia = NonNullable<MediaDetailsOptionsType["userMedia"]>;
export type ExtractUserMediaByType<T extends MediaType> =
    T extends typeof MediaType.GAMES ? Extract<UserMedia, { playtime: any }> :
        T extends (typeof MediaType.SERIES | typeof MediaType.ANIME) ? Extract<UserMedia, { currentSeason: any }> :
            T extends typeof MediaType.BOOKS ? Extract<UserMedia, { actualPage: any }> :
                T extends typeof MediaType.MANGA ? Extract<UserMedia, { currentChapter: any }> :
                    T extends typeof MediaType.MOVIES ? Exclude<UserMedia, { playtime: any } | { currentSeason: any } | { actualPage: any } | { currentChapter: any }> :
                        never;


// --- Media Details Types ---------------------------------------------------------
export type MediaDetails = MediaDetailsOptionsType["media"];
export type MediaFollowsDetails = MediaDetailsOptionsType["followsData"];
export type ExtractMediaDetailsByType<T extends MediaType> =
    T extends typeof MediaType.GAMES ? Extract<MediaDetails, { gameEngine: any }> :
        T extends (typeof MediaType.SERIES | typeof MediaType.ANIME) ? Extract<MediaDetails, { totalEpisodes: any }> :
            T extends typeof MediaType.BOOKS ? Extract<MediaDetails, { pages: any }> :
                T extends typeof MediaType.MANGA ? Extract<MediaDetails, { chapters: any }> :
                    T extends typeof MediaType.MOVIES ? Extract<MediaDetails, { tagline: any }> :
                        never;


// --- Follows List Types -----------------------------------------------------------
export type FollowData = MediaDetailsOptionsType["followsData"][number];
export type FollowUserMedia = FollowData["userMedia"];
export type ExtractFollowByType<T extends MediaType> = FollowData & { userMedia: ExtractFollowUserMediaByType<T> }
export type ExtractFollowUserMediaByType<T extends MediaType> =
    T extends typeof MediaType.GAMES ? Extract<FollowUserMedia, { playtime: any }> :
        T extends (typeof MediaType.SERIES | typeof MediaType.ANIME) ? Extract<FollowUserMedia, { currentSeason: any }> :
            T extends typeof MediaType.BOOKS ? Extract<FollowUserMedia, { actualPage: any }> :
                T extends typeof MediaType.MANGA ? Extract<FollowUserMedia, { currentChapter: any }> :
                    T extends typeof MediaType.MOVIES ? Exclude<FollowUserMedia, { playtime: any } | { currentSeason: any } | { actualPage: any }> :
                        never;


// --- Media List Types -------------------------------------------------------------
export type ListPagination = MediaListOptionsType["results"]["pagination"];
export type UserMediaItem = MediaListOptionsType["results"]["items"][number];
export type ExtractListByType<T extends MediaType> =
    T extends typeof MediaType.GAMES ? Extract<UserMediaItem, { playtime: any }> :
        T extends typeof MediaType.BOOKS ? Extract<UserMediaItem, { actualPage: any }> :
            T extends typeof MediaType.MANGA ? Extract<UserMediaItem, { currentChapter: any }> :
                T extends (typeof MediaType.SERIES | typeof MediaType.ANIME) ? Extract<UserMediaItem, { currentSeason: any }> :
                    T extends typeof MediaType.MOVIES ? Exclude<UserMediaItem, { playtime: any } | { currentSeason: any } | { actualPage: any }> :
                        never;


// --- Types for ProfileOptions ------------------------------------------------------
export type UserDataType = ProfileHeaderOptionsType["userData"];
export type UserFollowsType = ProfileOptionsType["userFollows"];
export type AchievementsType = ProfileOptionsType["achievements"];
export type UserUpdateType = ProfileOptionsType["userUpdates"][number];
export type PerMediaSummaryType = ProfileOptionsType["perMediaSummary"];
export type MediaGlobalSummaryType = ProfileOptionsType["mediaGlobalSummary"];
