import {Pagination} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getAllUserJobs, getImportJob, getImportJobIssues} from "@/lib/server/functions/imports";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const importJobsQueryKey = ["imports", "jobs"] as const;
export const importJobQueryKey = (jobId: number) => ["imports", "job", jobId] as const;
export const importJobIssuesQueryKey = (jobId: number) => ["imports", "job", jobId, "issues"] as const;


export const allUserJobsOptions = (enabled = true) => queryOptions({
    queryKey: viewerScopedKey(importJobsQueryKey),
    queryFn: () => getAllUserJobs(),
    enabled,
});


export const importJobOptions = (jobId: number, enabled = true) => queryOptions({
    queryKey: viewerScopedKey(importJobQueryKey(jobId)),
    queryFn: () => getImportJob({ data: { jobId } }),
    enabled,
});


export const importJobIssuesOptions = (jobId: number, pagination: Pagination = { page: 1, perPage: 25 }, enabled = true) => queryOptions({
    queryKey: viewerScopedKey([...importJobIssuesQueryKey(jobId), pagination.page ?? 1, pagination.perPage ?? 25]),
    queryFn: () => getImportJobIssues({
        data: {
            jobId,
            page: pagination.page ?? 1,
            perPage: pagination.perPage ?? 25,
        },
    }),
    enabled,
});
