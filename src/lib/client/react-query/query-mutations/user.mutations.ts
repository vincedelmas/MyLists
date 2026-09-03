import {useAuth} from "@/lib/client/hooks/use-auth";
import {ApiProviderType, SocialState} from "@/lib/utils/enums";
import {ProviderSearchResults} from "@/lib/types/provider.types";
import {postUpdateShowOnboarding} from "@/lib/server/functions/user-profile";
import {MutationMeta, QueryClient, useMutation, useQueryClient} from "@tanstack/react-query";
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


const updateNavbarFollowStatus = (queryClient: QueryClient, targetUserId: number, followStatus: SocialState | null) => {
    queryClient.setQueriesData<ProviderSearchResults>({ queryKey: ["navSearch"] }, (oldData) => {
        if (!oldData) return oldData;

        return {
            ...oldData,
            data: oldData.data.map((item) =>
                item.itemType === ApiProviderType.USERS && Number(item.id) === targetUserId
                    ? { ...item, followStatus }
                    : item
            ),
        };
    });
};


export const useFollowMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postFollow,
        onSuccess: ({ status }, variables) => {
            updateNavbarFollowStatus(queryClient, Number(variables.data.targetUserId), status);
            return invalidateSocialQueries(queryClient, profileUsername);
        },
    });
};


export const useUnfollowMutation = (profileUsername: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUnfollow,
        onSuccess: (_data, variables) => {
            updateNavbarFollowStatus(queryClient, Number(variables.data.targetUserId), null);
            return invalidateSocialQueries(queryClient, profileUsername);
        },
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


export const useGeneralSettingsMutation = (meta?: MutationMeta) => {
    return useMutation({
        mutationFn: ({ data }: { data: FormData }) => postGeneralSettings({ data }),
        meta: {
            successToastMessage: "Your settings have been updated.",
            ...meta,
        },
    });
};


export const useListSettingsMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postMediaListSettings,
        meta: {
            successToastMessage: "Your list settings have been updated.",
            ...meta,
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }),
            ]);
        },
    });
};


export const useProfileCustomMutation = (meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postProfileCustomSettings,
        meta: { ...meta },
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


export const usePasswordSettingsMutation = (meta?: MutationMeta) => {
    return useMutation({
        mutationFn: postPasswordSettings,
        meta: {
            successToastMessage: "Your password has been updated.",
            ...meta,
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
    const { refreshCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateFeatureFlag,
        onSuccess: () => refreshCurrentUser(),
    });
};


export const useUpdateOnboardingMutation = () => {
    const { refreshCurrentUser } = useAuth();

    return useMutation({
        mutationFn: postUpdateShowOnboarding,
        onSuccess: () => refreshCurrentUser(),
    });
};
