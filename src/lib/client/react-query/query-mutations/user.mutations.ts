import authClient from "@/lib/utils/auth-client";
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
        meta: { errorToastMessage: "Failed to follow this user." },
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useUnfollowMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUnfollow,
        meta: { errorToastMessage: "Failed to unfollow this user." },
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useRespondFollowRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRespondToFollowRequest,
        meta: { errorToastMessage: "This follow request was canceled." },
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
        meta: { errorToastMessage: "Failed to delete this notification." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: notificationsOptions(false, "social").queryKey });
        }
    })
}


export const useMarkAllNotifAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAllNotifAsRead,
        meta: { errorToastMessage: "Failed to mark all notifications as read." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: notificationsCountOptions.queryKey });
        }
    })
};


export const useRemoveFollowerMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postRemoveFollower,
        meta: { errorToastMessage: "Failed to remove this user as a follower." },
        onSuccess: () => invalidateSocialQueries(queryClient, profileUsername),
    });
};


export const useGeneralSettingsMutation = () => {
    return useMutation({
        mutationFn: ({ data }: { data: FormData }) => postGeneralSettings({ data }),
        meta: { errorToastMessage: "Failed to update your settings." }
    });
};


export const useListSettingsMutation = () => {
    return useMutation({
        mutationFn: postMediaListSettings,
        meta: {
            errorToastMessage: "Failed to update your list settings.",
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
        meta: { errorToastMessage: "Failed to download the list as CSV." },
    });
};


export const usePasswordSettingsMutation = () => {
    return useMutation({
        mutationFn: postPasswordSettings,
        meta: {
            errorToastMessage: "Failed to update your password.",
            successToastMessage: "Your password has been updated.",
        },
    });
};


export const useDeleteAccountMutation = () => {
    return useMutation({
        mutationFn: postDeleteUserAccount,
        meta: {
            errorToastMessage: "Failed to delete your account.",
            successToastMessage: "Your account has been deleted.",
        },
    });
};


export const useFeatureFlagMutation = () => {
    const { setCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateFeatureFlag,
        meta: { errorToastMessage: "Failed to update the feature flag." },
        onSuccess: () => setCurrentUser(),
    });
};


export const useUpdateOnboardingMutation = () => {
    const { setCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateShowOnboarding,
        meta: { errorToastMessage: "Failed to update the onboarding status." },
        onSuccess: () => setCurrentUser(),
    });
};


export const useUpdateEmailMutation = () => {
    return useMutation({
        mutationFn: async (email: string) => {
            const { error } = await authClient.changeEmail({ newEmail: email.trim() });
            if (error) throw error;
        },
    });
}
