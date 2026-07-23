import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {
    postAddMonthlyActivity,
    postBulkHideActivity,
    postRemoveMonthlyActivity,
    postUpdateMonthlyActivity,
} from "@/lib/server/functions/user-monthly-activity";


export const useAddMonthlyActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMonthlyActivity,
        meta: {
            successToastMessage: "Monthly activity added!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
        },
    });
};


export const useUpdateMonthlyActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateMonthlyActivity,
        meta: {
            successToastMessage: "Monthly activity updated!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
        },
    });
};


export const useRemoveMonthlyActivityMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRemoveMonthlyActivity,
        meta: {
            successToastMessage: "Media removed from the month!",
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
        },
    });
};
