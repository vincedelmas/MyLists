import {useAuth} from "@/lib/client/hooks/use-auth";
import {postUpdateShowOnboarding} from "@/lib/server/functions/user-profile";
import {QueryClient, useMutation, useQueryClient} from "@tanstack/react-query";
import {markAllNotifAsRead, postDeleteSocialNotif} from "@/lib/server/functions/notifications";
import {postFollow, postRemoveFollower, postRespondToFollowRequest, postUnfollow} from "@/lib/server/functions/social";
import {
    followersOptions,
    followsOptions,
    notificationsCountOptions,
    notificationsOptions,
    profileCustomOptions,
    profileHeaderOptions,
    profileOptions
} from "@/lib/client/react-query/query-options";
import {
    getDownloadListAsCSV,
    postDeleteUserAccount,
    postGeneralSettings,
    postMediaListSettings,
    postPasswordSettings,
    postProfileCustomSettings,
    postUpdateFeatureFlag
} from "@/lib/server/functions/user-settings";


const invalidateSocialQueries = async (queryClient: QueryClient, username: string) => {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasteMatches"] }),
        queryClient.invalidateQueries({ queryKey: followsOptions(username).queryKey }),
        queryClient.invalidateQueries({ queryKey: followersOptions(username).queryKey }),
        queryClient.invalidateQueries({ queryKey: profileHeaderOptions(username).queryKey }),
    ]);
};


export const useFollowMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postFollow,
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useUnfollowMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUnfollow,
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useRespondFollowRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRespondToFollowRequest,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: notificationsCountOptions.queryKey });
            await queryClient.invalidateQueries({ queryKey: notificationsOptions(false, "social").queryKey });
        }
    })
}


export const useDeleteSocialNotif = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteSocialNotif,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: notificationsOptions(false, "social").queryKey });
        }
    })
}


export const useMarkAllNotifAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAllNotifAsRead,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: notificationsCountOptions.queryKey });
        }
    })
};


export const useRemoveFollowerMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postRemoveFollower,
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useGeneralSettingsMutation = () => {
    return useMutation({
        mutationFn: ({ data }: { data: FormData }) => postGeneralSettings({ data }),
    });
};


export const useListSettingsMutation = () => {
    return useMutation({
        mutationFn: postMediaListSettings,
        meta: {
            successToastMessage: "Your list settings have been updated.",
        },
    });
};


export const useProfileCustomMutation = () => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postProfileCustomSettings,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: profileCustomOptions.queryKey });
            if (currentUser) {
                await queryClient.invalidateQueries({ queryKey: profileOptions(currentUser.name).queryKey });
                await queryClient.invalidateQueries({ queryKey: profileHeaderOptions(currentUser.name).queryKey });
            }
        },
    });
};


export const useDownloadListAsCSVMutation = () => {
    return useMutation({
        mutationFn: getDownloadListAsCSV,
    });
};


export const usePasswordSettingsMutation = () => {
    return useMutation({
        mutationFn: postPasswordSettings,
        meta: {
            successToastMessage: "Your password has been updated.",
        },
    });
};


export const useDeleteAccountMutation = () => {
    return useMutation({
        mutationFn: postDeleteUserAccount,
        meta: {
            successToastMessage: "Your account has been deleted.",
        },
    });
};


export const useFeatureFlagMutation = () => {
    const { setCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateFeatureFlag,
        onSuccess: () => setCurrentUser(),
    });
};


export const useUpdateOnboardingMutation = () => {
    const { setCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateShowOnboarding,
        onSuccess: () => setCurrentUser(),
    });
};
