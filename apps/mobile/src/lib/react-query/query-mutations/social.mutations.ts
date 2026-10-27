import {api} from "../../api-client";
import {useMutation, useQueryClient} from "@tanstack/react-query";


export function useSocialAction() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: api.socialAction,
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: ["social"] }),
                client.invalidateQueries({ queryKey: ["notifications"] }),
                client.invalidateQueries({ queryKey: ["notification-counts"] }),
                client.invalidateQueries({ queryKey: ["profile"] }),
            ]);
        },
    });
}
