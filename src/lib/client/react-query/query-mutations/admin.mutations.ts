import {toast} from "@/lib/client/components/ui/toast";
import {SearchType} from "@/lib/schemas";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {adminAchievementsOptions, adminArchivedTasksOptions, userAdminOptions} from "@/lib/client/react-query/query-options/admin.options";
import {
    postAdminDeleteArchivedTask,
    postAdminTriggerTask,
    postAdminUpdateAchievement,
    postAdminUpdateTiers,
    postAdminUpdateUser
} from "@/lib/server/functions/admin";


export const useAdminUpdateUserMutation = (filters: SearchType) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateUser,
        onSuccess: async (_data, variables) => {
            if (variables.data.userId) {
                if (variables.data.payload.deleteUser) {
                    toast.add({title: "User deleted successfully", type: "success"});
                } else {
                    toast.add({title: "User updated successfully", type: "success"});
                }
            }
            else {
                toast.add({title: "Global flag updated successfully", type: "success"});
            }

            return queryClient.invalidateQueries({ queryKey: userAdminOptions(filters).queryKey })
        },
    });
};


export const useAdminUpdateAchievementMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateAchievement,
        onSuccess: () => {
            return queryClient.invalidateQueries({ queryKey: adminAchievementsOptions.queryKey })
        },
    });
};


export const useAdminUpdateTiersMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateTiers,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminAchievementsOptions.queryKey }),
    });
};


export const useAdminTriggerTaskMutation = (meta?: MutationMeta) => {
    return useMutation({
        mutationFn: postAdminTriggerTask,
        meta: { ...meta },
    });
};


export const useAdminDeleteTaskMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminDeleteArchivedTask,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: adminArchivedTasksOptions.queryKey });
        },
    });
};
