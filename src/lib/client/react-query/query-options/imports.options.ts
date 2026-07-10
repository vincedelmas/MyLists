import {Pagination} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getAllUserJobs, getImportJob, getImportJobIssues} from "@/lib/server/functions/imports";


export const importJobsQueryKey = ["imports", "jobs"] as const;
export const importJobQueryKey = (jobId: number) => ["imports", "job", jobId] as const;
export const importJobIssuesQueryKey = (jobId: number) => ["imports", "job", jobId, "issues"] as const;


export const allUserJobsOptions = (enabled = true) => queryOptions({
    queryKey: importJobsQueryKey,
    queryFn: () => getAllUserJobs(),
    enabled,
});


export const importJobOptions = (jobId: number, enabled = true) => queryOptions({
    queryKey: importJobQueryKey(jobId),
    queryFn: () => getImportJob({ data: { jobId } }),
    enabled,
});


export const importJobIssuesOptions = (jobId: number, pagination: Pagination = { page: 1, perPage: 25 }, enabled = true) => queryOptions({
    queryKey: [...importJobIssuesQueryKey(jobId), pagination.page ?? 1, pagination.perPage ?? 25] as const,
    queryFn: () => getImportJobIssues({
        data: {
            jobId,
            page: pagination.page ?? 1,
            perPage: pagination.perPage ?? 25,
        },
    }),
    enabled,
});
