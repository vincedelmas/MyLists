import {useMutation, useQueryClient} from "@tanstack/react-query";
import {postAddMediadleGuess} from "@/lib/server/functions/moviedle";
import {dailyMediadleOptions} from "@/lib/client/react-query/query-options";


export const useMoviedleGuessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediadleGuess,
        meta: { errorToastMessage: "Failed to add your guess." },
        onSuccess: () => {
            return queryClient.invalidateQueries({ queryKey: dailyMediadleOptions.queryKey });
        },
    });
};
