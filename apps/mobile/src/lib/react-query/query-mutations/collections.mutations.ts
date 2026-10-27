import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../api-client";


export function useCollectionAction() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: api.communityCollectionAction,
        onSuccess: async result => {
            if (result.action === "view") return;

            await Promise.all([
                client.invalidateQueries({ queryKey: ["collections"] }),
                ...(result.action === "copy"
                    ? [client.invalidateQueries({ queryKey: ["lists", "library"] })]
                    : []),
            ]);
        },
    });
}
