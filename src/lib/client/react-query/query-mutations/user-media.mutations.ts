import {SimpleSearch} from "@/lib/schemas";
import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdatePayload} from "@/lib/types/user-media.types";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {
    postAddMediaToList,
    postDeleteUserUpdates,
    postEditUserTag,
    postRemoveMediaFromList,
    postUpdateUserCustomCover,
    postUpdateUserMedia
} from "@/lib/server/functions/user-media";
import {allUpdatesOptions, historyOptions, mediaDetailsOptions, mediaListOptions, profileOptions, tagNamesOptions, tagsViewOptions} from "@/lib/client/react-query/query-options";


export type UserMediaQueryOption = ReturnType<typeof mediaDetailsOptions> | ReturnType<typeof mediaListOptions>;

export type UpdateUserMediaMutationOptions = {
    loggedAt?: string;
    backlogMode?: boolean;
}


export const useDeleteProfileUpdateMutation = (username: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        meta: { errorToastMessage: "Failed to delete this update." },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(profileOptions(username).queryKey, (oldData) => {
                if (!oldData || !data) return;
                return {
                    ...oldData,
                    userUpdates: [...oldData.userUpdates.filter((up) => up.id !== variables.data.updateIds[0]), data],
                };
            });
        },
    });
};


export const useDeleteAllUpdatesMutation = (username: string, filters: SimpleSearch) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        meta: { errorToastMessage: "Failed to delete all updates." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: allUpdatesOptions(username, filters).queryKey });
        },
    });
};


export const useDeleteHistoryUpdatesMutation = (mediaType: MediaType, mediaId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        meta: { errorToastMessage: "Failed to delete this history update." },
        onSuccess: async (_data, variables) => {
            return queryClient.setQueryData(historyOptions(mediaType, mediaId).queryKey, (oldData) => {
                if (!oldData) return;
                return [...oldData.filter((history) => history.id !== variables.data.updateIds[0])];
            });
        },
    });
};


export const useAddMediaToListMutation = (queryOption: UserMediaQueryOption) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediaToList,
        meta: {
            successToastMessage: "Media added to your list!",
            errorToastMessage: "Failed to add this media to your list",
        },
        onSuccess: (data, variables) => {
            if (queryOption.queryKey[0] === "details") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData || !data) return;
                    return Object.assign({}, oldData, { userMedia: data });
                });
            }
            else if (queryOption.queryKey[0] === "userList") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return {
                        ...oldData,
                        results: Object.assign({}, oldData.results, {
                            items: oldData.results.items.map((m) =>
                                m.mediaId === variables.data.mediaId ? Object.assign({}, m, { common: true }) : m
                            )
                        }),
                    };
                });
            }
        }
    });
};


export const useRemoveMediaFromListMutation = (queryOption: UserMediaQueryOption) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRemoveMediaFromList,
        meta: {
            successToastMessage: "Media removed from your list!",
            errorToastMessage: "Failed to remove this media from your list.",
        },
        onSuccess: (_data, variables) => {
            if (queryOption.queryKey[0] === "details") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return { ...oldData, userMedia: null };
                });
            }
            else if (queryOption.queryKey[0] === "userList") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return {
                        ...oldData,
                        results: Object.assign({}, oldData.results, {
                            items: [...oldData.results.items.filter((m) => m.mediaId !== variables.data.mediaId)]
                        }),
                    };
                })
            }
        }
    });
};


export const useUpdateUserMediaMutation = (mediaType: MediaType, mediaId: number, queryOption: UserMediaQueryOption, options: UpdateUserMediaMutationOptions = {}) => {
    const queryClient = useQueryClient();

    const activityUpdateTypes = new Set<UpdateType>([
        UpdateType.TV,
        UpdateType.PAGE,
        UpdateType.REDO,
        UpdateType.STATUS,
        UpdateType.CHAPTER,
        UpdateType.PLAYTIME,
    ]);

    return useMutation({
        mutationFn: ({ payload }: UpdatePayload) => {
            const activityUpdate = activityUpdateTypes.has(payload.type);

            if (options.backlogMode && !activityUpdate) {
                throw new FormattedError("Progress only can be edited in backlog mode.");
            }

            if (options.backlogMode && activityUpdate && !options.loggedAt) {
                throw new FormattedError("Please choose a backlog date.");
            }

            const payloadWithDate = options.loggedAt && activityUpdate ? { ...payload, loggedAt: options.loggedAt } : payload;

            return postUpdateUserMedia({ data: { payload: payloadWithDate, mediaType, mediaId } });
        },
        meta: { errorToastMessage: "Failed to update this media." },
        onSuccess: async (data, variables) => {
            const activityUpdate = activityUpdateTypes.has(variables.payload.type);

            await queryClient.invalidateQueries({ queryKey: historyOptions(mediaType, mediaId).queryKey });
            if (activityUpdate) {
                await queryClient.invalidateQueries({ queryKey: ["monthly-activity"] });
            }

            if (queryOption.queryKey[0] === "details") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return { ...oldData, userMedia: { ...oldData.userMedia, ...data } };
                })
            }
            else if (queryOption.queryKey[0] === "userList") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return {
                        ...oldData,
                        results: {
                            ...oldData.results,
                            items: oldData.results.items.map((userMedia) => {
                                return userMedia.mediaId === mediaId ? { ...userMedia, ...data } : userMedia
                            }),
                        }
                    };
                });
            }
        },
    });
};


export const useUpdateCustomCoverMutation = (queryOption: UserMediaQueryOption) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateUserCustomCover,
        meta: {
            successToastMessage: "Custom cover updated!",
            errorToastMessage: "Failed to update this custom cover."
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryOption.queryKey });
        },
    });
};


export const useEditTagMutation = (mediaType: MediaType, mediaId?: number, meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tag, action }: { tag: Tag, action: TagAction }) => {
            return postEditUserTag({ data: { mediaType, mediaId, tag, action } });
        },
        meta: { ...meta },
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({ queryKey: tagsViewOptions(mediaType, currentUser!.name).queryKey });

            queryClient.setQueryData(tagNamesOptions(mediaType, false).queryKey, (oldData) => {
                if (!oldData || !data) return;
                return oldData.map((c) => c?.name).includes(data?.name ?? "") ? oldData : [...oldData, data];
            });
        }
    })
};
