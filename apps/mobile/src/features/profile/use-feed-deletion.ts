import {Trash2} from "lucide-react-native";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../lib/api-client";
import {useConfirmation} from "../../hooks/use-confirmation";

export function useFeedDeletion() {
    const client = useQueryClient();
    const { confirmation, confirm, dismiss } = useConfirmation();
    const mutation = useMutation({
        mutationFn: api.deleteHistory,
        onSuccess: async () => {
            dismiss();
            await client.invalidateQueries({ queryKey: ["profile"] });
        },
    });

    return {
        confirmationProps: { confirmation, dismiss, pending: mutation.isPending, error: mutation.error?.message },
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
