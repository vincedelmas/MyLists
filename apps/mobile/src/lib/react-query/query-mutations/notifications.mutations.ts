import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../api-client";

export function useNotificationAction() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: api.notificationAction,
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: ["notifications"] }),
                client.invalidateQueries({ queryKey: ["notification-counts"] }),
            ]);
        },
    });
}
