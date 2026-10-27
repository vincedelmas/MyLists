import {infiniteQueryOptions, queryOptions} from "@tanstack/react-query";
import {api, type MonthlyActivityInput} from "../../api-client";

export const monthlyActivityOptions = (filters: Omit<MonthlyActivityInput, "page">, userId?: number) => infiniteQueryOptions({
    queryKey: ["monthly-activity", userId, "rows", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => api.monthlyActivity({ ...filters, page: pageParam }, signal, userId),
    getNextPageParam: (last, _pages, page) => page < last.pages ? page + 1 : undefined,
});

export const monthlyActivityStatsOptions = (period: Pick<MonthlyActivityInput, "year" | "month" | "view">, userId?: number) => queryOptions({
    queryKey: ["monthly-activity", userId, "stats", period],
    queryFn: ({ signal }) => api.monthlyActivityStats(period, signal, userId),
    staleTime: 60_000,
});

export const activityMediaSearchOptions = (mediaType: Parameters<typeof api.searchActivityMedia>[0], search: string) => queryOptions({
    queryKey: ["activity-media-search", mediaType, search],
    queryFn: ({ signal }) => api.searchActivityMedia(mediaType, search, signal),
    staleTime: 30_000,
});
