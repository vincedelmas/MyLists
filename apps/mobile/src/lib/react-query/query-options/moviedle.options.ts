import {queryOptions} from "@tanstack/react-query";
import {api} from "../../api-client";


export const moviedleOptions = queryOptions({
    queryKey: ["moviedle", "daily"],
    queryFn: ({ signal }) => api.moviedle(signal),
});


export const moviedleLeaderboardOptions = queryOptions({
    queryKey: ["moviedle", "leaderboard"],
    queryFn: ({ signal }) => api.moviedleLeaderboard(signal),
});


export const moviedleSuggestionsOptions = (query: string) =>
    queryOptions({
        queryKey: ["moviedle", "suggestions", query],
        queryFn: ({ signal }) => api.moviedleSuggestions(query, signal),
        enabled: query.trim().length >= 2,
        staleTime: 60_000,
    });
