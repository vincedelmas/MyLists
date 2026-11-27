import {UpdateType} from "@/lib/utils/enums";
import {useNavigate} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {captureEvent} from "@/lib/client/analytics";
import {toast} from "@/lib/client/components/ui/toast";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getContinueMedia, postContinueMedia} from "@/lib/server/functions/continue";
import {maybeTriggerNightOwl} from "@/lib/client/achievements/achievement-toasts";
import {historyOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import type {ContinueItem, continueOptions} from "@/lib/client/react-query/query-options/continue.options";
import {invalidateUserProgressQueries, userMediaEditKey} from "@/lib/client/react-query/query-mutations/user-media-cache";


export const useContinueMediaMutation = ({ mediaType, mediaId, mediaName }: ContinueItem) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: userMediaEditKey(mediaType, mediaId),
        mutationFn: () => postContinueMedia({ data: { mediaType, mediaId } }),
        onMutate: () => {
            return queryClient.cancelQueries({ queryKey: ["continue", currentUser!.name] });
        },
        onSuccess: async ({ item, completed }) => {
            captureEvent("media_updated", { media_type: mediaType, source: "continue" });
            maybeTriggerNightOwl(queryClient, currentUser?.id);
            const queryKey = ["continue", currentUser!.name];

            // Refetching started during save must not overwrite result
            await queryClient.cancelQueries({ queryKey });
            const readyToComplete = item !== null && getMediaDefinition(mediaType).continue.getUpdate(item)?.type === UpdateType.STATUS;

            for (const [key] of queryClient.getQueriesData({ queryKey })) {
                const filters = key[2] as ReturnType<typeof continueOptions>["queryKey"][2] | undefined;
                const hideItem = !item || ((filters?.preview || filters?.progress === "active") && readyToComplete);

                queryClient.setQueryData<Awaited<ReturnType<typeof getContinueMedia>>>(key, oldData => {
                    if (!oldData) return;
                    return {
                        ...oldData,
                        items: oldData.items.flatMap(previous => previous.mediaType === mediaType && previous.mediaId === mediaId
                            ? hideItem ? [] : [item!]
                            : [previous]),
                    };
                });
            }

            if (readyToComplete) {
                void queryClient.invalidateQueries({ queryKey: [...queryKey, { preview: true }] });
            }

            // Refresh visible feed, secondary views reload their stale data when revisited
            void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["year-recap"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["userList", mediaType], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", mediaType, mediaId], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: historyOptions(mediaType, mediaId).queryKey, refetchType: "none" }),
                // Keep the current page in place while clicking; navigation reloads its stale ordering.
                invalidateUserProgressQueries(queryClient, currentUser!.name, { refetchContinue: completed, refetchSecondary: false }),
                queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaId).queryKey, refetchType: "none" }),
            ]);

            if (completed) {
                toast.add({
                    timeout: 6000,
                    type: "success",
                    description: mediaName,
                    title: "Marked completed",
                    actionProps: {
                        children: "View details",
                        onClick: () => void navigate({ to: "/details/$mediaType/$mediaId", params: { mediaType, mediaId } }),
                    },
                });
            }
        },
    });
};
