import {MediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import {MonthlyActivitySearch} from "@/lib/schemas";
import {getMonthlyActivity, getMonthlyActivityMediaSearch, getMonthlyActivityStats} from "@/lib/server/functions/user-monthly-activity";


export const monthlyActivityStatsOptions = (username: string, search: Pick<MonthlyActivitySearch, "year" | "month"> & { mediaType?: MediaType }) => {
    return queryOptions({
        queryKey: ["monthly-activity", username, "stats", search],
        queryFn: () => getMonthlyActivityStats({ data: { username, ...search } }),
        staleTime: Infinity,
    });
}


export const monthlyActivityOptions = (username: string, search: MonthlyActivitySearch) => {
    return queryOptions({
        queryKey: ["monthly-activity", username, "rows", search],
        queryFn: () => getMonthlyActivity({ data: { username, ...search } }),
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
