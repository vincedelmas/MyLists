import {UpdateType} from "@/lib/utils/enums";
import {useNavigate} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {toast} from "@/lib/client/components/ui/toast";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getContinueMedia, postContinueMedia} from "@/lib/server/functions/continue";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {historyOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {invalidateUserProgressQueries} from "@/lib/client/react-query/query-mutations/invalidate-user-progress";


export const useContinueMediaMutation = ({ mediaType, mediaId, mediaName }: ContinueItem) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", mediaType],
        mutationFn: () => postContinueMedia({ data: { mediaType, mediaId } }),
        onMutate: () => {
            return queryClient.cancelQueries({ queryKey: ["continue", currentUser!.name] });
        },
        onSuccess: async ({ item, completed }) => {
            const queryKey = ["continue", currentUser!.name];

            // Refetching started during save must not overwrite result
            await queryClient.cancelQueries({ queryKey });

            for (const [key] of queryClient.getQueriesData({ queryKey })) {
                const preview = (key[2] as { preview?: boolean } | undefined)?.preview;
                const hideItem = !item || (preview && getMediaDefinition(mediaType).continue.getUpdate(item)?.type === UpdateType.STATUS);

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

            // Removing an item can expose next page candidate and changes totals
            if (completed || (item && getMediaDefinition(mediaType).continue.getUpdate(item)?.type === UpdateType.STATUS)) {
                void queryClient.invalidateQueries({ queryKey });
            }

            // Refresh visible feed, secondary views reload their stale data when revisited
            void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["year-recap"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["monthly-activity"], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["userList", mediaType], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", mediaType, mediaId], refetchType: "none" }),
                queryClient.invalidateQueries({ queryKey: historyOptions(mediaType, mediaId).queryKey, refetchType: "none" }),
                invalidateUserProgressQueries(queryClient, currentUser!.name, { refetchContinue: false, refetchSecondary: false }),
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
