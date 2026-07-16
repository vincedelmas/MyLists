import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postCreateImportJob, postDeleteImportJob} from "@/lib/server/functions/imports";
import {importJobIssuesQueryKey, importJobOptions, importJobQueryKey, importJobsQueryKey} from "@/lib/client/react-query/query-options/imports.options";


export const useCreateImportJobMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data }: { data: FormData }) => postCreateImportJob({ data }),
        onSuccess: async (job) => {
            await queryClient.invalidateQueries({ queryKey: importJobsQueryKey });
            await queryClient.invalidateQueries({ queryKey: importJobQueryKey(job.jobId) });
        },
    });
};


export const useDeleteImportJobMutation = (jobId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteImportJob,
        meta: {
            successToastMessage: "Import job deleted.",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: importJobsQueryKey });
            queryClient.removeQueries({ queryKey: importJobIssuesQueryKey(jobId) });
            queryClient.removeQueries({ queryKey: importJobOptions(jobId).queryKey, exact: true });
        },
    });
};
