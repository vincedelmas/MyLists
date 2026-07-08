import {Pagination} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getImportJob, getImportJobIssues} from "@/lib/server/functions/imports";


export const importJobOptions = (jobId: number, enabled = true) => queryOptions({
    queryKey: ["imports", "job", jobId] as const,
    queryFn: () => getImportJob({ data: { jobId } }),
    enabled,
});


export const importJobIssuesOptions = (jobId: number, pagination: Pagination = { page: 1, perPage: 25 }, enabled = true) => queryOptions({
    queryKey: ["imports", "job", jobId, "issues", pagination] as const,
    queryFn: () => getImportJobIssues({ data: { jobId, ...pagination } }),
    enabled,
});
