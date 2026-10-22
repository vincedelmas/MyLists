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


export const profileExtrasOptions = queryOptions({
    queryKey: ["profile", "extras"],
    queryFn: ({ signal }) => api.profileExtras(signal),
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
