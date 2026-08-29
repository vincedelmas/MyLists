import {useMutation, useQueryClient} from "@tanstack/react-query";
import {postAddMediadleGuess} from "@/lib/server/functions/moviedle";
import {dailyMediadleOptions, mediadleLeaderboardOptions} from "@/lib/client/react-query/query-options";


export const useMoviedleGuessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediadleGuess,
        onSuccess: ({ completed }) => {
            const invalidations = [queryClient.invalidateQueries({ queryKey: dailyMediadleOptions.queryKey })];
            if (completed) invalidations.push(queryClient.invalidateQueries({ queryKey: mediadleLeaderboardOptions.queryKey }));
            return Promise.all(invalidations);
        },
    });
};
