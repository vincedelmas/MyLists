import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postAddActivity, postBulkHideActivity, postDeleteActivity, postUpdateActivity} from "@/lib/server/functions/user-activity";


export const useAddActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddActivity,
        meta: {
            successToastMessage: "Activity added successfully!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
            await queryClient.invalidateQueries({ queryKey: ["specific-activity"] });
        },
    });
};


export const useUpdateActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateActivity,
        meta: {
            successToastMessage: "Activity updated successfully!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
            await queryClient.invalidateQueries({ queryKey: ["specific-activity"] });
        },
    });
};


export const useDeleteActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteActivity,
        meta: {
            successToastMessage: "Activity deleted successfully!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
        },
    });
};


export const useBulkHideActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postBulkHideActivity,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
            await queryClient.invalidateQueries({ queryKey: ["specific-activity"] });
        },
    });
};
