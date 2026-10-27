import {Trash2} from "lucide-react-native";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api, type MediaParams} from "../../lib/api-client";
import {useConfirmation} from "../../hooks/use-confirmation";


export function useFeedDeletion(media?: MediaParams) {
    const client = useQueryClient();
    const { confirmation, confirm, dismiss } = useConfirmation();
    const mutation = useMutation({
        mutationFn: api.deleteHistory,
        onSuccess: async () => {
            dismiss();
            await Promise.all([
                client.invalidateQueries({
                    queryKey: ["profile"],
                    refetchType: media ? "none" : "active"
                }),
                ...(media ? [client.invalidateQueries({ queryKey: ["media", media.mediaType, media.mediaId, "history"] })] : [])
            ]);
        },
    });

    return {
        confirmationProps: {
            confirmation,
            dismiss,
            pending: mutation.isPending,
            error: mutation.error?.message
        },
        deleteUpdate: (updateId: number) => {
            if (mutation.isPending) return;
            mutation.reset();
            confirm({
                title: "Delete this update?",
                message: "This update will be permanently deleted.",
                label: "Delete update",
                cancelLabel: "Keep update",
                icon: Trash2,
                closeOnConfirm: false,
                onConfirm: () => mutation.mutate(updateId),
            });
        },
    };
}
