import {Alert} from "react-native";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../lib/api-client";

export function useFeedDeletion() {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: api.deleteHistory,
        onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
        onError: (error) => Alert.alert("Couldn’t delete this update", error.message),
    });

    return (updateId: number) => {
        if (mutation.isPending) return;
        Alert.alert("Delete this update?", "This update will be permanently deleted.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete update", style: "destructive", onPress: () => mutation.mutate(updateId) },
        ]);
    };
}
