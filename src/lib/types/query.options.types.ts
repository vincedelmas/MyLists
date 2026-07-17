import {MediaType} from "@/lib/utils/enums";
import type {
    ListPagination as MediaListPagination,
    MediaListItem,
} from "@/lib/contracts/media/lists";
import type {MediaDetailsPage} from "@/lib/contracts/media/details";
import type {LibraryHistory} from "@/lib/contracts/media/projections";
import {adminOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";
import {
    achievementOptions,
    hallOfFameOptions,
    profileHeaderOptions,
    profileOptions,
    tasteMatchesOptions,
    upcomingOptions,
} from "@/lib/client/react-query/query-options";


// --- Inferred Query Options Types -----------------------------------------------------
type ProfileOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof profileOptions>["queryFn"]>>>;
export type HistoryOptionsType = LibraryHistory;
export type ProfileHeaderOptionsType = Awaited<ReturnType<NonNullable<ReturnType<typeof profileHeaderOptions>["queryFn"]>>>;
export type AchCard = Awaited<ReturnType<NonNullable<ReturnType<typeof achievementOptions>["queryFn"]>>>["result"][number];
export type AchSummary = Awaited<ReturnType<NonNullable<ReturnType<typeof achievementOptions>["queryFn"]>>>["summary"][MediaType];
export type HofUserData = Awaited<ReturnType<NonNullable<ReturnType<typeof hallOfFameOptions>["queryFn"]>>>["items"][number];
export type HofUserRank = Awaited<ReturnType<NonNullable<ReturnType<typeof hallOfFameOptions>["queryFn"]>>>["userRanks"];
export type TasteMatch = NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof tasteMatchesOptions>["queryFn"]>>>["featuredMatch"]>;
export type ComingNextItem = Awaited<ReturnType<NonNullable<ReturnType<typeof upcomingOptions>["queryFn"]>>>[number]["items"][number];
export type AdminUserOverview = Awaited<ReturnType<NonNullable<typeof adminOverviewOptions.queryFn>>>["recentUsers"];


// --- User Media Details Types ----------------------------------------------------
export type UserMedia = NonNullable<MediaDetailsPage["userMedia"]>;
export type ExtractUserMediaByType<T extends MediaType> = T extends MediaType ? Extract<UserMedia, { kind: T }> : never;


// --- Media Details Types ---------------------------------------------------------
export type MediaDetails = MediaDetailsPage["media"];
export type MediaFollowsDetails = MediaDetailsPage["followsData"];
export type ExtractMediaDetailsByType<T extends MediaType> = T extends MediaType ? Extract<MediaDetails, { kind: T }> : never;


// --- Follows List Types -----------------------------------------------------------
export type FollowData = MediaDetailsPage["followsData"][number];
export type ExtractFollowByType<T extends MediaType> = T extends MediaType ? Extract<FollowData, { kind: T }> : never;


// --- Media List Types -------------------------------------------------------------
export type ListPagination = MediaListPagination;
export type UserMediaItem = MediaListItem;
export type ExtractListByType<T extends MediaType> = T extends MediaType ? Extract<UserMediaItem, { kind: T }> : never;


// --- Types for ProfileOptions ------------------------------------------------------
export type UserDataType = ProfileHeaderOptionsType["userData"];
export type UserFollowsType = ProfileOptionsType["userFollows"];
export type AchievementsType = ProfileOptionsType["achievements"];
export type UserUpdateType = ProfileOptionsType["userUpdates"][number];
export type PerMediaSummaryType = ProfileOptionsType["perMediaSummary"];
export type MediaGlobalSummaryType = ProfileOptionsType["mediaGlobalSummary"];
