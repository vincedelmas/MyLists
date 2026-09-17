import {useNavigate} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {toast} from "@/lib/client/components/ui/toast";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {postContinueMedia} from "@/lib/server/functions/continue";
import {historyOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {invalidateUserProgressQueries} from "@/lib/client/react-query/invalidate-user-progress";
import {ContinueItem, continueOptions} from "@/lib/client/react-query/query-options/continue.options";


export const useContinueMediaMutation = ({ mediaType, mediaId, mediaName }: ContinueItem) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["userMediaEdit", mediaType],
        mutationFn: () => postContinueMedia({ data: { mediaType, mediaId } }),
        onMutate: () => {
            return queryClient.cancelQueries({ queryKey: continueOptions(currentUser!.name).queryKey });
        },
        onSuccess: async ({ item, completed }) => {
            const queryKey = continueOptions(currentUser!.name).queryKey;

            // Refetching started during save must not overwrite authoritative result
            await queryClient.cancelQueries({ queryKey });

            queryClient.setQueryData(queryKey, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    items: oldData.items.flatMap(previous => previous.mediaType === mediaType && previous.mediaId === mediaId
                        ? item ? [item] : []
                        : [previous]),
                };
            });

            // Refresh the visible feed; secondary views reload their stale data when revisited.
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
