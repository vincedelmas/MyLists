import { api } from "../../api-client";
import { queryOptions } from "@tanstack/react-query";

export const profileOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId],
        queryFn: ({ signal }) => api.profile(signal, userId),
    });

export const profileActivityOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "activity"],
        queryFn: ({ signal }) => api.profileActivity(signal, userId),
    });

export const statsOptions = (tab: Parameters<typeof api.stats>[0], userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "stats", tab],
        queryFn: ({ signal }) => api.stats(tab, signal, userId),
    });

export const profileFollowsFeedOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "extras"],
        queryFn: ({ signal }) => api.profileExtras(signal, userId),
        select: (data) => data.followsFeed,
    });

export const achievementsOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "achievements"],
        queryFn: ({ signal }) => api.achievements(signal, userId),
    });

export const recentAchievementsOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "achievements", "recent"],
        queryFn: ({ signal }) => api.recentAchievements(signal, userId),
    });

export const calendarOptions = (range: Parameters<typeof api.calendar>[0], userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "calendar", range],
        queryFn: ({ signal }) => api.calendar(range, signal, userId),
    });

export const profileContinueOptions = (userId?: number) =>
    queryOptions({
        queryKey: ["profile", userId, "continue"],
        queryFn: ({ signal }) => api.libraryDetail({ kind: "continue", page: 1, search: "" }, signal, userId),
    });

export const personOptions = (userId: number) =>
    queryOptions({
        queryKey: ["profile", userId, "person"],
        queryFn: ({ signal }) => api.person(userId, signal),
    });
