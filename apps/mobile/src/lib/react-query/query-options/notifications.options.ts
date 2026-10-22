import { queryOptions } from "@tanstack/react-query";
import { api } from "../../api-client";
export const notificationCountsOptions = queryOptions({
    queryKey: ["notification-counts"],
    queryFn: ({ signal }) => api.notificationCounts(signal),
    refetchInterval: 60_000,
});
export const notificationsOptions = (type: Parameters<typeof api.notifications>[0]) =>
    queryOptions({
        queryKey: ["notifications", type],
        queryFn: ({ signal }) => api.notifications(type, signal),
    });
