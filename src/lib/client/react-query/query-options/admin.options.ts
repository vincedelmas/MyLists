import {SearchType} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import type {AdminApiMonitoringParams, AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";
import {
    getAdminAchievements,
    getAdminAllCollections,
    getAdminAllUsers,
    getAdminApiMonitoringStats,
    getAdminArchivedTasks,
    getAdminCollectionsOverview,
    getAdminInactiveAccountDeletions,
    getAdminMediadleStats,
    getAdminMediaOverview,
    getAdminMediaRefreshStats,
    getAdminOverview,
    getAdminTasks,
    getAdminWhichCameFirstStats,
} from "@/lib/server/functions/admin";


export const userAdminOptions = (search: SearchType) => queryOptions({
    queryKey: ["admin", "updateUsers", search],
    queryFn: () => getAdminAllUsers({ data: search }),
});


export const inactiveAccountDeletionsAdminOptions = (search: SearchType) => queryOptions({
    queryKey: ["admin", "inactive-account-deletions", search],
    queryFn: () => getAdminInactiveAccountDeletions({ data: search }),
});


export const adminOverviewOptions = queryOptions({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview(),
});


export const adminMediaOverviewOptions = queryOptions({
    queryKey: ["admin", "media-overview"],
    queryFn: () => getAdminMediaOverview(),
});


export const adminCollectionsOverviewOptions = queryOptions({
    queryKey: ["admin", "collections-overview"],
    queryFn: () => getAdminCollectionsOverview(),
});


export const adminCollectionsOptions = (search: SearchType) => queryOptions({
    queryKey: ["admin", "collections", search],
    queryFn: () => getAdminAllCollections({ data: search }),
});


export const adminAchievementsOptions = queryOptions({
    queryKey: ["admin", "achievements"],
    queryFn: () => getAdminAchievements(),
});


export const adminMediadleOptions = (search: SearchType) => queryOptions({
    queryKey: ["admin", "mediadle", search],
    queryFn: () => getAdminMediadleStats({ data: search }),
});


export const adminWhichCameFirstOptions = queryOptions({
    queryKey: ["admin", "which-came-first"],
    queryFn: () => getAdminWhichCameFirstStats(),
});


export const adminTasksOptions = queryOptions({
    queryKey: ["admin", "tasks"],
    queryFn: () => getAdminTasks(),
    staleTime: Infinity,
});


export const adminArchivedTasksOptions = queryOptions({
    queryKey: ["admin", "tasks", "archived"],
    queryFn: getAdminArchivedTasks,
});


export const adminMediaRefreshOptions = (params: AdminMediaRefreshStatsParams = {}) => queryOptions({
    queryKey: ["admin", "media-refresh", params],
    queryFn: () => getAdminMediaRefreshStats({ data: params }),
});


export const adminApiMonitoringOptions = (params: AdminApiMonitoringParams = {}) => queryOptions({
    queryKey: ["admin", "api-monitoring", params],
    queryFn: () => getAdminApiMonitoringStats({ data: params }),
});
