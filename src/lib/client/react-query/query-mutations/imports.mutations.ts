import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postCreateImportJob, postDeleteImportJob} from "@/lib/server/functions/imports";
import {finishedImportJobsOptions, importJobOptions} from "@/lib/client/react-query/query-options/imports.options";


export const useCreateImportJobMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data }: { data: FormData }) => postCreateImportJob({ data }),
        meta: {
            successToastMessage: "Import job created.",
            ...meta,
        },
        onSuccess: async (job) => {
            await queryClient.invalidateQueries({ queryKey: importJobOptions(job.jobId).queryKey });
            await queryClient.invalidateQueries({ queryKey: finishedImportJobsOptions.queryKey });
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
            queryClient.removeQueries({ queryKey: importJobOptions(jobId).queryKey });
            queryClient.removeQueries({ queryKey: ["imports", "job", jobId, "issues"] });
            await queryClient.invalidateQueries({ queryKey: finishedImportJobsOptions.queryKey });
        },
    });
};
