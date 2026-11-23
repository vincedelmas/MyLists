import {SearchType} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {toast} from "@/lib/client/components/ui/toast";
import type {AdminBookMergeResult} from "@/lib/types/admin.types";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {mediaDetailsOptions} from "@/lib/client/react-query/query-options/media.options";
import {
    adminAchievementsOptions,
    adminArchivedTasksOptions,
    adminYearRecapReleasesOptions,
    userAdminOptions,
} from "@/lib/client/react-query/query-options/admin.options";
import {
    postAdminDeleteArchivedTask,
    postAdminDismissBookMergeSuggestion,
    postAdminMergeBooks,
    postAdminTriggerTask,
    postAdminUpdateAchievement,
    postAdminUpdateTiers,
    postAdminUpdateUser,
    postAdminUpdateYearRecapRelease,
    postAdminUpdateMediaCover,
    postImpersonateUser,
} from "@/lib/server/functions/admin";


export const useAdminImpersonateUserMutation = () => {
    return useMutation({
        mutationFn: postImpersonateUser,
    });
}


export const useAdminUpdateMediaCoverMutation = (mediaType: MediaType, mediaId: number, onSuccess?: () => void) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateMediaCover,
        meta: { noErrorToast: true, successToastMessage: "Cover saved." },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["admin", "missing-covers"] }),
                queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaId).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["userList", mediaType] }),
                queryClient.invalidateQueries({ queryKey: ["release-calendar"] }),
            ]);
            onSuccess?.();
        },
    });
};


export const useAdminMergeBooksMutation = (onSuccess?: (result: AdminBookMergeResult) => void) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminMergeBooks,
        onSuccess: async (result) => {
            const movedLabel = `${result.movedListEntries} user ${result.movedListEntries === 1 ? "entry" : "entries"} moved`;

            const dupLabel = result.duplicateListEntriesRemoved > 0
                ? `, ${result.duplicateListEntriesRemoved} overlapping ${result.duplicateListEntriesRemoved === 1 ? "entry" : "entries"} deduplicated`
                : "";

            toast.add({
                type: "success",
                description: `${movedLabel}${dupLabel}.`,
                title: `Merged ${result.mergedBookCount} ${result.mergedBookCount === 1 ? "book" : "books"} into #${result.targetBookId}`,
            });

            onSuccess?.(result);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["admin", "book-merges"] }),
                queryClient.invalidateQueries({ queryKey: ["admin", "book-merge-preview"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["admin", "missing-covers"] }),
                queryClient.invalidateQueries({ queryKey: ["admin", "media-overview"] }),
                queryClient.invalidateQueries({ queryKey: ["details", MediaType.BOOKS] }),
                queryClient.invalidateQueries({ queryKey: ["userList", MediaType.BOOKS] }),
                queryClient.invalidateQueries({ queryKey: ["continue"] }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists"] }),
                queryClient.invalidateQueries({ queryKey: ["collections"] }),
            ]);
        },
    });
};


export const useAdminDismissBookMergeSuggestionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminDismissBookMergeSuggestion,
        meta: { successToastMessage: "Suggestion dismissed." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["admin", "book-merges"] });
        },
    });
};


export const useAdminUpdateYearRecapReleaseMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateYearRecapRelease,
        meta: { successToastMessage: "Year recap release updated." },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["year-recap-releases"] }),
                queryClient.invalidateQueries({ queryKey: adminYearRecapReleasesOptions.queryKey }),
            ]);
        },
    });
};


export const useAdminUpdateUserMutation = (filters: SearchType) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateUser,
        onSuccess: async (_data, variables) => {
            if (variables.data.userId) {
                if (variables.data.payload.deleteUser) {
                    toast.add({ title: "User deleted successfully", type: "success" });
                }
                else {
                    toast.add({ title: "User updated successfully", type: "success" });
                }
            }
            else {
                toast.add({ title: "Global flag updated successfully", type: "success" });
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
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminTriggerTask,
        meta: { ...meta },
        onSuccess: (_data, { data: { taskName } }) => {
            toast.add({ title: `Task ${taskName} completed`, type: "success" });
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: adminArchivedTasksOptions.queryKey })
        },
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
