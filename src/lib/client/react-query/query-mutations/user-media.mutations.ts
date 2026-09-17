import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdatePayload} from "@/lib/types/user-media.types";
import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {loggedActivityUpdateTypes, SimpleSearch, updateUserMediaSchema} from "@/lib/schemas";
import {invalidateUserProgressQueries} from "@/lib/client/react-query/invalidate-user-progress";
import {
    allUpdatesOptions,
    continueOptions,
    historyOptions,
    mediaDetailsOptions,
    mediaListOptions,
    profileOptions,
    profileRecentFeedOptions,
    tagNamesOptions
} from "@/lib/client/react-query/query-options";
import {
    postAddMediaToList,
    postDeleteUserUpdates,
    postEditUserTag,
    postRemoveMediaFromList,
    postUpdateUserCustomCover,
    postUpdateUserMedia
} from "@/lib/server/functions/user-media";


export type UserMediaQueryOption = ReturnType<typeof mediaDetailsOptions> | ReturnType<typeof mediaListOptions>;

export type UpdateUserMediaMutationOptions = {
    loggedAt?: string;
    backlogMode?: boolean;
}


export const useDeleteProfileUpdateMutation = (username: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        onSuccess: async (data, variables) => {
            queryClient.setQueryData(profileRecentFeedOptions(username).queryKey, (oldData) => {
                if (!oldData) return;

                const userUpdates = oldData.filter((up) => !variables.data.updateIds.includes(up.id));
                if (data && !userUpdates.some((up) => up.id === data.id)) {
                    userUpdates.push(data);
                }

                return userUpdates;
            });
            await queryClient.invalidateQueries({ queryKey: ["allUpdates", username] });
        },
    });
};


export const useDeleteAllUpdatesMutation = (username: string, filters: SimpleSearch) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileRecentFeedOptions(username).queryKey }),
                queryClient.invalidateQueries({ queryKey: allUpdatesOptions(username, filters).queryKey }),
            ]);
        },
    });
};


export const useDeleteHistoryUpdatesMutation = (mediaType: MediaType, mediaId: number) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteUserUpdates,
        onSuccess: async (_data, variables) => {
            queryClient.setQueryData(historyOptions(mediaType, mediaId).queryKey, (oldData) => {
                if (!oldData) return;
                return [...oldData.filter((history) => history.id !== variables.data.updateIds[0])];
            });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileRecentFeedOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["allUpdates", currentUser!.name] }),
            ]);
        },
    });
};


export const useAddMediaToListMutation = (queryOption: UserMediaQueryOption) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediaToList,
        meta: {
            successToastMessage: "Media added to your list!",
        },
        onSuccess: async (data, variables) => {
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

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
                invalidateUserProgressQueries(queryClient, currentUser!.name),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["listFilters", variables.data.mediaType, currentUser!.name] }),
            ]);
        }
    });
};


export const useRemoveMediaFromListMutation = (queryOption: UserMediaQueryOption) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", queryOption.queryKey[1]],
        mutationFn: postRemoveMediaFromList,
        meta: {
            successToastMessage: "Media removed from your list!",
        },
        onSuccess: async (_data, variables) => {
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

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
                invalidateUserProgressQueries(queryClient, currentUser!.name),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }),
                queryClient.invalidateQueries({ queryKey: ["userList", variables.data.mediaType] }),
                queryClient.invalidateQueries({ queryKey: ["listFilters", variables.data.mediaType, currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", variables.data.mediaType, variables.data.mediaId] }),
            ]);
        }
    });
};


export const useUpdateUserMediaMutation = (mediaType: MediaType, mediaId: number, queryOption: UserMediaQueryOption, options: UpdateUserMediaMutationOptions = {}) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", mediaType],
        mutationFn: ({ payload }: UpdatePayload) => {
            const activityUpdate = loggedActivityUpdateTypes.has(payload.type);

            if (options.backlogMode && !activityUpdate) {
                throw new FormattedError("Progress only can be edited in backlog mode.");
            }
            if (options.backlogMode && activityUpdate && !options.loggedAt) {
                throw new FormattedError("Please choose a backlog date.");
            }

            const payloadWithDate = options.loggedAt && activityUpdate ? { ...payload, loggedAt: options.loggedAt } : payload;

            // Check frontend side
            const result = updateUserMediaSchema.safeParse({ payload: payloadWithDate, mediaType, mediaId });
            if (!result.success) {
                throw new FormattedError(result.error.issues[0].message);
            }

            return postUpdateUserMedia({ data: result.data });
        },
        onSuccess: async (data, variables) => {
            const activityUpdate = loggedActivityUpdateTypes.has(variables.payload.type);

            const invalidations = [
                invalidateUserProgressQueries(queryClient, currentUser!.name),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", mediaType, mediaId] }),
                queryClient.invalidateQueries({ queryKey: historyOptions(mediaType, mediaId).queryKey }),
            ];

            if (variables.payload.type === UpdateType.FAVORITE) {
                invalidations.push(queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }));
            }

            if (activityUpdate) {
                invalidations.push(queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }));
            }

            if (queryOption.queryKey[0] === "details") {
                invalidations.push(queryClient.invalidateQueries({ queryKey: ["userList", mediaType] }));
            }

            await Promise.all(invalidations);

            if (queryOption.queryKey[0] === "details") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return { ...oldData, userMedia: { ...oldData.userMedia, ...data } };
                })
            }
            else if (queryOption.queryKey[0] === "userList") {
                await queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaId).queryKey });

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


export const useUpdateCustomCoverMutation = (queryOption: UserMediaQueryOption, meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", queryOption.queryKey[1]],
        mutationFn: postUpdateUserCustomCover,
        meta: {
            successToastMessage: "Custom cover updated!",
            ...meta,
        },
        onSuccess: async (data) => {
            if (queryOption.queryKey[0] === "userList") {
                queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                    if (!oldData) return;
                    return {
                        ...oldData,
                        results: Object.assign({}, oldData.results, {
                            items: oldData.results.items.map((item) =>
                                item.mediaId === data.mediaId ? { ...item, customCover: data.customCover } : item
                            ),
                        }),
                    };
                });
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: continueOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                ...(queryOption.queryKey[0] === "details"
                    ? [queryClient.invalidateQueries({ queryKey: queryOption.queryKey })]
                    : []),
            ]);
        },
    });
};


export const useEditTagMutation = (mediaType: MediaType, mediaId?: number, meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", mediaType],
        mutationFn: ({ tag, action }: { tag: Tag, action: TagAction }) => {
            return postEditUserTag({ data: { mediaType, mediaId, tag, action } });
        },
        meta: { ...meta },
        onSuccess: async (data) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tagsView", mediaType, currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: ["listFilters", mediaType, currentUser!.name] }),
            ]);

            queryClient.setQueryData(tagNamesOptions(mediaType, false).queryKey, (oldData) => {
                if (!oldData || !data) return;
                return oldData.map((c) => c?.name).includes(data?.name ?? "") ? oldData : [...oldData, data];
            });
        }
    })
};
