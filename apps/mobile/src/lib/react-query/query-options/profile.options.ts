import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";

export const profileOptions = queryOptions({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.profile(signal),
});


export const profileActivityOptions = queryOptions({
    queryKey: ["profile", "activity"],
    queryFn: ({ signal }) => api.profileActivity(signal),
});


export const statsOptions = (tab: Parameters<typeof api.stats>[0]) => queryOptions({
    queryKey: ["profile", "stats", tab],
    queryFn: ({ signal }) => api.stats(tab, signal),
});


export const profileFollowsFeedOptions = queryOptions({
    queryKey: ["profile", "extras"],
    queryFn: ({ signal }) => api.profileExtras(signal),
    select: (data) => data.followsFeed,
});


export const achievementsOptions = queryOptions({
    queryKey: ["profile", "achievements"],
    queryFn: ({ signal }) => api.achievements(signal),
});


export const recentAchievementsOptions = queryOptions({
    queryKey: ["profile", "achievements", "recent"],
    queryFn: ({ signal }) => api.recentAchievements(signal),
});


export const calendarOptions = (range: Parameters<typeof api.calendar>[0]) => queryOptions({
    queryKey: ["profile", "calendar", range],
    queryFn: ({ signal }) => api.calendar(range, signal),
});


export const profileContinueOptions = queryOptions({
    queryKey: ["profile", "continue"],
    queryFn: ({ signal }) => api.libraryDetail({kind: "continue", page: 1, search: ""}, signal),
});


export const personOptions = (userId: number) => queryOptions({
    queryKey: ["profile", "person", userId],
    queryFn: ({signal}) => api.person(userId, signal),
});
