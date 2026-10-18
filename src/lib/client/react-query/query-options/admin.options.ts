import {SearchType} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getAdminMissingCovers} from "@/lib/server/functions/admin";
import type {AdminMissingCoversSearch} from "@/lib/schemas/admin.schema";
import type {AdminImportsSearch, AdminListsSearch} from "@/lib/schemas/admin.schema";
import type {AdminApiMonitoringParams, AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";
import {
    getAdminAchievements,
    getAdminAllUpdatesHistory,
    getAdminImports,
    getAdminImportIssues,
    getAdminLists,
    getAdminAllUsers,
    getAdminApiMonitoringStats,
    getAdminArchivedTasks,
    getAdminListsOverview,
    getAdminInactiveAccountDeletions,
    getAdminListLogFiles,
    getAdminMediaOverview,
    getAdminMediaRefreshStats,
    getAdminOverview,
    getAdminReadLogFile,
    getAdminTasks,
    getAdminYearRecapReleases,
} from "@/lib/server/functions/admin";


export type AdminUser = AdminUsersData["items"][number];
export type AdminImportJob = AdminImportsData["items"][number];
export type AdminUsersData = Awaited<ReturnType<typeof getAdminAllUsers>>;
export type AdminImportsData = Awaited<ReturnType<typeof getAdminImports>>;
export type AdminLogFilesData = Awaited<ReturnType<typeof getAdminListLogFiles>>;
export type AdminMissingCoversData = Awaited<ReturnType<typeof getAdminMissingCovers>>;
export type AdminArchivedTasksData = Awaited<ReturnType<typeof getAdminArchivedTasks>>;
export type AdminApiRequestsData = Awaited<ReturnType<typeof getAdminApiMonitoringStats>>;
export type AdminMediaRefreshData = Awaited<ReturnType<typeof getAdminMediaRefreshStats>>;
export type AdminUpdateHistoryData = Awaited<ReturnType<typeof getAdminAllUpdatesHistory>>;
export type AdminInactiveAccountsData = Awaited<ReturnType<typeof getAdminInactiveAccountDeletions>>;


export const adminAllUpdatesOptions = (filters: SearchType) => queryOptions({
    queryKey: ["adminAllUpdates", filters],
    queryFn: () => getAdminAllUpdatesHistory({ data: filters }),
});


export const adminImportsOptions = (search: AdminImportsSearch) => queryOptions({
    queryKey: ["admin", "imports", search],
    queryFn: () => getAdminImports({ data: search }),
    refetchInterval: 10_000,
});


export const adminMissingCoversOptions = (search: AdminMissingCoversSearch) => queryOptions({
    queryKey: ["admin", "missing-covers", search],
    queryFn: () => getAdminMissingCovers({ data: search }),
});


export const adminImportIssuesOptions = (jobId: number, page: number, enabled: boolean) => queryOptions({
    queryKey: ["admin", "import-issues", jobId, page],
    queryFn: () => getAdminImportIssues({ data: { jobId, page, perPage: 25 } }),
    refetchInterval: 10_000,
    enabled,
});


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


export const adminYearRecapReleasesOptions = queryOptions({
    queryKey: ["admin", "year-recap-releases"],
    queryFn: () => getAdminYearRecapReleases(),
});


export const adminMediaOverviewOptions = queryOptions({
    queryKey: ["admin", "media-overview"],
    queryFn: () => getAdminMediaOverview(),
});


export const adminListsOverviewOptions = queryOptions({
    queryKey: ["admin", "lists-overview"],
    queryFn: () => getAdminListsOverview(),
});


export const adminListsOptions = (search: AdminListsSearch) => queryOptions({
    queryKey: ["admin", "lists", search],
    queryFn: () => getAdminLists({ data: search }),
});


export const adminAchievementsOptions = queryOptions({
    queryKey: ["admin", "achievements"],
    queryFn: () => getAdminAchievements(),
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


export const adminLogFilesOptions = queryOptions({
    queryKey: ["admin", "logs", "files"],
    queryFn: () => getAdminListLogFiles(),
    staleTime: 15_000,
});


export const adminLogFileOptions = (fileName: string) => queryOptions({
    queryKey: ["admin", "logs", "file", fileName],
    queryFn: () => getAdminReadLogFile({ data: { fileName } }),
    staleTime: 5_000,
});
