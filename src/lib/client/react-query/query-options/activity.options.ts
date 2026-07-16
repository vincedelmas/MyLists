import {MediaType} from "@/lib/utils/enums";
import {ActivitySearch} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getActivityAddMediaSearch, getMonthlyActivity, getMonthlyActivityStats} from "@/lib/server/functions/user-activity";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const monthlyActivityStatsOptions = (username: string, search: Pick<ActivitySearch, "year" | "month"> & { mediaType?: MediaType }) => {
    return queryOptions({
        queryKey: viewerScopedKey(["monthly-activity", username, "stats", search]),
        queryFn: () => getMonthlyActivityStats({ data: { username, ...search } }),
        staleTime: Infinity,
    });
}


export const monthlyActivityOptions = (username: string, search: ActivitySearch) => {
    return queryOptions({
        queryKey: viewerScopedKey(["monthly-activity", username, "rows", search]),
        queryFn: () => getMonthlyActivity({ data: { username, ...search } }),
    });
}


export const activityMediaAddSearchOptions = (mediaType: MediaType, query: string) => {
    return queryOptions({
        queryKey: viewerScopedKey(["activity-user-media-search", mediaType, query]),
        queryFn: () => getActivityAddMediaSearch({ data: { mediaType, query } }),
        enabled: query.trim().length >= 2,
        staleTime: 30 * 1000,
    });
}
