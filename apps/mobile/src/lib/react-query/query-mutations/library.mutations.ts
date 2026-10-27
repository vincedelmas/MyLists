import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../api-client";


export function useLibraryAction(onSuccess?: () => void) {
    const client = useQueryClient();

    return useMutation({
        mutationFn: api.libraryAction,
        onSuccess: async (_result, input) => {
            onSuccess?.();

            await Promise.all([
                client.invalidateQueries({ queryKey: ["lists", "library"] }),
                client.invalidateQueries({ queryKey: ["profile", undefined, "extras"] }),
                ...(input.action === "collection" || input.action === "delete" && input.kind === "collection"
                    ? [client.invalidateQueries({ queryKey: ["collections"] })]
                    : []),
                ...(input.action === "pin" || input.action === "delete"
                    ? [client.invalidateQueries({ queryKey: ["settings", "profile"] })]
                    : []),
            ]);
        },
    });
}
