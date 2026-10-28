import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {captureEvent} from "@/lib/client/analytics";
import {toast} from "@/lib/client/components/ui/toast";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdatePayload} from "@/lib/types/user-media.types";
import {formatMonthYear} from "@/lib/utils/formatting/date";
import {toActivityDisplayValue} from "@/lib/utils/media/activity";
import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {loggedActivityUpdateTypes, SimpleSearch, updateUserMediaSchema} from "@/lib/schemas";
import {profilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {requestActivityCorrection} from "@/lib/client/components/activity/MonthlyActivityCorrection";
import {createUserMediaCache, userMediaEditKey} from "@/lib/client/components/media/user-media-cache";
import {invalidateUserProgressQueries} from "@/lib/client/react-query/query-mutations/invalidate-user-progress";
import {allUpdatesOptions, historyOptions, profileOptions, profileRecentFeedOptions, tagNamesOptions} from "@/lib/client/react-query/query-options";
import {
    postAddMediaToList,
    postDeleteUserUpdates,
    postEditUserTag,
    postRemoveMediaFromList,
    postUpdateUserCustomCover,
    postUpdateUserMedia,
    postUpdateUserMediaNotifications
} from "@/lib/server/functions/user-media";


export type UpdateUserMediaMutationOptions = {
    source?: "list_dialog" | "details";
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


export const useAddMediaToListMutation = (source: "details" | "quick_add" = "details") => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediaToList,
        meta: { successToastMessage: "Media added to your list!" },
        onSuccess: async (data, variables) => {
            captureEvent("media_added", { media_type: variables.data.mediaType, source });
            await createUserMediaCache(queryClient, currentUser!.name, variables.data.mediaType, data.mediaId).add();

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


export const useRemoveMediaFromListMutation = (mediaType: MediaType, mediaId: number) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: postRemoveMediaFromList,
        meta: {
            successToastMessage: "Media removed from your list!",
        },
        onSuccess: async (_data, variables) => {
            await createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).remove();

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
                invalidateUserProgressQueries(queryClient, currentUser!.name),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }),
                queryClient.invalidateQueries({ queryKey: ["userList", variables.data.mediaType] }),
                queryClient.invalidateQueries({ queryKey: ["listFilters", variables.data.mediaType, currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: ["tagsView", variables.data.mediaType, currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: tagNamesOptions(variables.data.mediaType, false).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", variables.data.mediaType, variables.data.mediaId] }),
            ]);
        }
    });
};


export const useUpdateUserMediaMutation = (mediaType: MediaType, mediaId: number, options: UpdateUserMediaMutationOptions = {}) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: async ({ payload }: UpdatePayload) => {
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

            let response = await postUpdateUserMedia({ data: result.data });
            while (response.kind === "correction-required") {
                const activityCorrection = await requestActivityCorrection(mediaType, response.preview);
                if (!activityCorrection) return null;

                response = await postUpdateUserMedia({ data: { ...result.data, activityCorrection } });
            }

            if (response.activityCorrection) {
                const correction = response.activityCorrection;
                const unit = getMediaDefinition(mediaType).progress.unit.short;
                const description = correction.changes.map(change => {
                    const amounts = [];
                    if (change.progressRemoved > 0) amounts.push(`−${toActivityDisplayValue(mediaType, change.progressRemoved)} ${unit}`);
                    if (change.redoRemoved > 0) amounts.push(`−${change.redoRemoved} re-experiences`);
                    return `${formatMonthYear(change.monthBucket)}: ${amounts.join(", ")}`;
                }).join("; ");

                toast.add({
                    type: "success",
                    title: correction.keptHistory ? "Progress updated; activity unchanged." : "Progress and activity corrected.",
                    description: correction.keptHistory ? undefined : description
                        || "There was no matching recorded activity to reduce.",
                });
            }

            return response.userMedia;
        },
        onMutate: () => {
            return createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).cancel();
        },
        onSuccess: async (data, variables) => {
            if (!data) return;

            captureEvent("media_updated", { media_type: mediaType, source: options.source ?? "details" });
            const { payload } = variables;
            const activityUpdate = loggedActivityUpdateTypes.has(payload.type);
            await createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).update(data);

            // Secondary screens refresh on next visit, visible feed updates in background
            void Promise.all([
                invalidateUserProgressQueries(queryClient, currentUser!.name, {
                    refetchContinue: false,
                    refetchSecondary: false,
                    progressChanged: activityUpdate,
                }),
                queryClient.invalidateQueries({ queryKey: ["year-recap"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: historyOptions(mediaType, mediaId).queryKey }),
                ...(activityUpdate || (payload.type === UpdateType.RATING && "seasonRating" in payload)
                    ? [queryClient.invalidateQueries({ queryKey: ["tvSeasons", mediaType, mediaId], refetchType: "none" })] : []),
                ...(payload.type === UpdateType.FAVORITE
                    ? [queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey, refetchType: "none" })] : []),
                ...(payload.type === UpdateType.PLATFORM
                    ? [queryClient.invalidateQueries({ queryKey: ["listFilters", mediaType, currentUser!.name], refetchType: "none" })] : []),
                ...(activityUpdate
                    ? [queryClient.invalidateQueries({ queryKey: ["monthly-activity"], refetchType: "none" })] : []),
            ]);
        },
    });
};


export const useUpdateUserMediaNotificationsMutation = (mediaType: MediaType, mediaId: number) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: postUpdateUserMediaNotifications,
        onSuccess: async (_data, { data: { releaseNotificationsEnabled } }) => {
            await createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).update({ releaseNotificationsEnabled });
        },
    });
};


export const useUpdateCustomCoverMutation = (mediaType: MediaType, mediaId: number, meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: postUpdateUserCustomCover,
        meta: {
            successToastMessage: "Custom cover updated!",
            ...meta,
        },
        onSuccess: async (data) => {
            await createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).update({ customCover: data.customCover });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["continue", currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "user", currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: profilePinsOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
            ]);
        },
    });
};


export const useEditTagMutation = (mediaType: MediaType, mediaId?: number, meta?: MutationMeta) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: ({ tag, action }: { tag: Tag, action: TagAction }) => {
            return postEditUserTag({ data: { mediaType, mediaId, tag, action } });
        },
        meta: { ...meta },
        onSuccess: async (_data, { action, tag }) => {
            if (mediaId !== undefined && (action === TagAction.ADD || action === TagAction.DELETE_ONE)) {
                await createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).editTag(tag, action);
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tagsView", mediaType, currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: tagNamesOptions(mediaType, false).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "user", currentUser!.name] }),
                queryClient.invalidateQueries({ queryKey: profilePinsOptions(currentUser!.name).queryKey }),
                queryClient.invalidateQueries({ queryKey: ["listFilters", mediaType, currentUser!.name] }),

                // Per-entry edits refresh when the media dialog closes, keeping the item available to edit.
                queryClient.invalidateQueries({
                    queryKey: ["userList", mediaType, currentUser!.name],
                    refetchType: action === TagAction.ADD || action === TagAction.DELETE_ONE ? "none" : "active",
                }),

                queryClient.invalidateQueries({ queryKey: ["details", mediaType], refetchType: mediaId === undefined ? "active" : "none" }),
            ]);
        }
    })
};
