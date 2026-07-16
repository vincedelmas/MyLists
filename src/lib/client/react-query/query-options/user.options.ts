import {queryOptions} from "@tanstack/react-query";
import {HallOfFameSearch, highlightedMediaSearchSchema, SimpleSearch, StatsActiveTab} from "@/lib/schemas";
import {getUserStats} from "@/lib/server/functions/user-stats";
import {getHallOfFame} from "@/lib/server/functions/hall-of-fame";
import {HighlightedMediaTab} from "@/lib/types/profile-custom.types";
import {getPlatformStats} from "@/lib/server/functions/platform-stats";
import {getUserAchievements} from "@/lib/server/functions/user-achievements";
import {getProfileCustomSearch, getProfileCustomSettings} from "@/lib/server/functions/user-settings";
import {getAllUpdatesHistory, getUserProfile, getUserProfileHeader, getUsersFollowers, getUsersFollows} from "@/lib/server/functions/user-profile";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const profileHeaderOptions = (username: string) => queryOptions({
    queryKey: viewerScopedKey(["profile", "header", username]),
    queryFn: () => getUserProfileHeader({ data: { username } }),
});


export const profileOptions = (username: string) => queryOptions({
    queryKey: viewerScopedKey(["profile", username]),
    queryFn: () => getUserProfile({ data: { username } }),
});


export const profileCustomOptions = () => queryOptions({
    queryKey: viewerScopedKey(["settings", "profile-custom"]),
    queryFn: getProfileCustomSettings,
});


export const profileCustomSearchOptions = (tab: HighlightedMediaTab, query: string) => {
    const parsedSearch = highlightedMediaSearchSchema.safeParse({ tab, query });

    return queryOptions({
        queryKey: viewerScopedKey(["settings", "profile-custom", "search", tab, query]),
        queryFn: () => {
            if (!parsedSearch.success) {
                return [];
            }
            return getProfileCustomSearch({ data: parsedSearch.data });
        },
        enabled: parsedSearch.success,
        staleTime: 60 * 1000,
    });
};


export const followersOptions = (username: string) => queryOptions({
    queryKey: viewerScopedKey(["followers", username]),
    queryFn: () => getUsersFollowers({ data: { username } }),
});


export const followsOptions = (username: string) => queryOptions({
    queryKey: viewerScopedKey(["follows", username]),
    queryFn: () => getUsersFollows({ data: { username } }),
});


export const allUpdatesOptions = (username: string, filters: SimpleSearch) => queryOptions({
    queryKey: viewerScopedKey(["allUpdates", username, filters]),
    queryFn: () => getAllUpdatesHistory({ data: { ...filters, username } }),
});


export const hallOfFameOptions = (search: HallOfFameSearch) => queryOptions({
    queryKey: viewerScopedKey(["hof", search]),
    queryFn: () => getHallOfFame({ data: search }),
});


export const achievementOptions = (username: string) => queryOptions({
    queryKey: viewerScopedKey(["achievementPage", username]),
    queryFn: () => getUserAchievements({ data: { username } }),
});


export const userStatsOptions = (username: string, activeTab: StatsActiveTab) => queryOptions({
    queryKey: viewerScopedKey(["userStats", username, activeTab]),
    queryFn: () => getUserStats({ data: { username, activeTab } }),
});


export const platformStatsOptions = (activeTab: StatsActiveTab) => queryOptions({
    queryKey: ["platformStats", activeTab],
    queryFn: () => getPlatformStats({ data: { activeTab } }),
});
