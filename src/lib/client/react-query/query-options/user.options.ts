import {queryOptions} from "@tanstack/react-query";
import {getUserStats} from "@/lib/server/functions/user-stats";
import {getHallOfFame} from "@/lib/server/functions/hall-of-fame";
import {HighlightedMediaTab} from "@/lib/types/profile-custom.types";
import {getPlatformStats} from "@/lib/server/functions/platform-stats";
import {getUserAchievements} from "@/lib/server/functions/user-achievements";
import {getProfileCustomSearch, getProfileCustomSettings} from "@/lib/server/functions/user-settings";
import {HallOfFameSearch, highlightedMediaSearchSchema, SimpleSearch, StatsActiveTab} from "@/lib/schemas";
import {getAllUpdatesHistory, getRandomPublicProfile, getUserProfile, getUserProfileHeader, getUsersFollowers, getUsersFollows} from "@/lib/server/functions/user-profile";


export const profileHeaderOptions = (username: string) => queryOptions({
    queryKey: ["profile", "header", username],
    queryFn: () => getUserProfileHeader({ data: { username } }),
});


export const profileOptions = (username: string) => queryOptions({
    queryKey: ["profile", username],
    queryFn: () => getUserProfile({ data: { username } }),
});


export const profileCustomOptions = queryOptions({
    queryKey: ["settings", "profile-custom"],
    queryFn: getProfileCustomSettings,
});


export const profileCustomSearchOptions = (tab: HighlightedMediaTab, query: string) => {
    const parsedSearch = highlightedMediaSearchSchema.safeParse({ tab, query });

    return queryOptions({
        queryKey: ["settings", "profile-custom", "search", tab, query],
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
    queryKey: ["followers", username],
    queryFn: () => getUsersFollowers({ data: { username } }),
});


export const followsOptions = (username: string) => queryOptions({
    queryKey: ["follows", username],
    queryFn: () => getUsersFollows({ data: { username } }),
});


export const allUpdatesOptions = (username: string, filters: SimpleSearch) => queryOptions({
    queryKey: ["allUpdates", username, filters],
    queryFn: () => getAllUpdatesHistory({ data: { ...filters, username } }),
});


export const hallOfFameOptions = (search: HallOfFameSearch) => queryOptions({
    queryKey: ["hof", search],
    queryFn: () => getHallOfFame({ data: search }),
});


export const achievementOptions = (username: string) => queryOptions({
    queryKey: ["achievementPage", username],
    queryFn: () => getUserAchievements({ data: { username } }),
});


export const userStatsOptions = (username: string, activeTab: StatsActiveTab) => queryOptions({
    queryKey: ["userStats", username, activeTab],
    queryFn: () => getUserStats({ data: { username, activeTab } }),
});


export const platformStatsOptions = (activeTab: StatsActiveTab) => queryOptions({
    queryKey: ["platformStats", activeTab],
    queryFn: () => getPlatformStats({ data: { activeTab } }),
});


export const randomPublicProfile = queryOptions({
    queryKey: ["profile", "random-public"],
    queryFn: getRandomPublicProfile,
    refetchOnMount: "always",
});
