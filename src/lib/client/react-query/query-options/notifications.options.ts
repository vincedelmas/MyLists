import {queryOptions} from "@tanstack/react-query";
import {NotifTab} from "@/lib/types/notifications.types";
import {getNotifications, getNotificationsCount} from "@/lib/server/functions/notifications";


export const notificationsCountOptions = queryOptions({
    queryKey: ["notification-counts"],
    queryFn: getNotificationsCount,
    refetchInterval: 30 * 60 * 1000,
    meta: { errorToastMessage: "An error occurred getting your notifications count." },
});


export const notificationsOptions = (open: boolean, activeTab: NotifTab) => queryOptions({
    queryKey: ["notifications", activeTab],
    queryFn: () => getNotifications({ data: { type: activeTab } }),
    meta: { errorToastMessage: "An error occurred fetching the notifications." },
    enabled: open,
});
