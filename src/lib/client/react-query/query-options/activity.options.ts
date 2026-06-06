import {MediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import {ActivitySearch} from "@/lib/types/activity.types";
import {getActivityAddMediaSearch, getMonthlyActivity, getMonthlyActivityStats} from "@/lib/server/functions/user-activity";


export const monthlyActivityStatsOptions = (username: string, search: Pick<ActivitySearch, "year" | "month"> & { mediaType?: MediaType }) => {
    return queryOptions({
        queryKey: ["monthly-activity", username, "stats", search],
        queryFn: () => getMonthlyActivityStats({ data: { username, ...search } }),
        staleTime: Infinity,
    });
}


export const monthlyActivityOptions = (username: string, search: ActivitySearch) => {
    return queryOptions({
        queryKey: ["monthly-activity", username, "rows", search],
        queryFn: () => getMonthlyActivity({ data: { username, ...search } }),
    });
}


export const activityMediaAddSearchOptions = (mediaType: MediaType, query: string) => {
    return queryOptions({
        queryKey: ["activity-user-media-search", mediaType, query],
        queryFn: () => getActivityAddMediaSearch({ data: { mediaType, query } }),
        enabled: query.trim().length >= 2,
        staleTime: 30 * 1000,
    });
}
