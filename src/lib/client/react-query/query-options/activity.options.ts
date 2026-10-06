import type {MediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import type {MonthlyActivitySearch} from "@/lib/schemas";
import {getMonthlyActivity, getMonthlyActivityMediaSearch, getMonthlyActivityStats} from "@/lib/server/functions/user-monthly-activity";


type MonthlyActivityStatsSearchOpts = Pick<MonthlyActivitySearch, "year" | "month" | "view"> & { mediaType?: MediaType };


export const monthlyActivityStatsOptions = (username: string, search: MonthlyActivityStatsSearchOpts) => {
    return queryOptions({
        queryKey: ["monthly-activity", username, "stats", search],
        queryFn: () => getMonthlyActivityStats({ data: { username, ...search } }),
        staleTime: Infinity,
    });
}


export const monthlyActivityOptions = (username: string, search: MonthlyActivitySearch) => {
    const { display: _display, ...filters } = search;

    return queryOptions({
        queryKey: ["monthly-activity", username, "rows", filters],
        queryFn: () => getMonthlyActivity({ data: { username, ...filters } }),
    });
}


export const monthlyActivityMediaSearchOptions = (mediaType: MediaType, query: string) => {
    return queryOptions({
        queryKey: ["activity-user-media-search", mediaType, query],
        queryFn: () => getMonthlyActivityMediaSearch({ data: { mediaType, query } }),
        enabled: query.trim().length >= 2,
        staleTime: 30 * 1000,
    });
}
