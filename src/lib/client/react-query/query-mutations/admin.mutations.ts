import {toast} from "sonner";
import {SearchType} from "@/lib/schemas";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {adminAchievementsOptions, adminArchivedTasksOptions, adminErrorLogsOptions, userAdminOptions} from "@/lib/client/react-query/query-options/admin.options";
import {
    postAdminDeleteArchivedTask,
    postAdminDeleteErrorLog,
    postAdminTriggerTask,
    postAdminUpdateAchievement,
    postAdminUpdateTiers,
    postAdminUpdateUser
} from "@/lib/server/functions/admin";


export const useAdminUpdateUserMutation = (filters: SearchType) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateUser,
        meta: { errorToastMessage: "Failed to update this user." },
        onSuccess: async (_data, variables) => {
            if (variables.data.userId) {
                if (variables.data.payload.deleteUser) toast.success("User deleted successfully");
                else toast.success("User updated successfully");
            }
            else {
                toast.success("Global flag updated successfully");
            }

            return queryClient.invalidateQueries({ queryKey: userAdminOptions(filters).queryKey })
        },
    });
};


export const useAdminUpdateAchievementMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateAchievement,
        meta: { errorToastMessage: "Failed to update this achievement." },
        onSuccess: () => {
            return queryClient.invalidateQueries({ queryKey: adminAchievementsOptions.queryKey })
        },
    });
};


export const useAdminUpdateTiersMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateTiers,
        meta: { errorToastMessage: "Failed to update this achievement tier." },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminAchievementsOptions.queryKey }),
    });
};


export const useAdminTriggerTaskMutation = () => {
    return useMutation({
        mutationFn: postAdminTriggerTask,
    });
};


export const useAdminDeleteTaskMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminDeleteArchivedTask,
        meta: { errorToastMessage: "Failed to delete this task." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: adminArchivedTasksOptions.queryKey });
        },
    });
};


export const useAdminDeleteErrorLogsMutation = (search: SearchType) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminDeleteErrorLog,
        meta: { errorToastMessage: "Failed to delete this error log." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: adminErrorLogsOptions(search).queryKey });
        },
    });
};
