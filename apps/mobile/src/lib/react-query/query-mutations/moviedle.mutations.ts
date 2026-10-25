import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../api-client";

export function useMoviedleGuess() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: api.moviedleGuess,
        // A timed-out response may still have consumed an attempt. Always resync.
        onSettled: async () => {
            await client.invalidateQueries({ queryKey: ["moviedle"] });
        },
    });
}
