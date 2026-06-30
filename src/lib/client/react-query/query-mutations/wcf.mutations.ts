import {useMutation, useQueryClient} from "@tanstack/react-query";
import {whichCameFirstOptions} from "@/lib/client/react-query/query-options";
import {postAbandonWhichCameFirstRun, postAnswerWhichCameFirstRound, postResetWhichCameFirstStats, postStartWhichCameFirstRun} from "@/lib/server/functions/which-came-first";


export const useStartWCFRunMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postStartWhichCameFirstRun,
        meta: { errorToastMessage: "Failed to start the game." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: whichCameFirstOptions.queryKey });
        },
    });
};


export const useAnswerWCFRoundMutation = () => useMutation({
    mutationFn: postAnswerWhichCameFirstRound,
    meta: { errorToastMessage: "Failed to submit the answer." },
});


export const useAbandonWCFRunMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAbandonWhichCameFirstRun,
        meta: { errorToastMessage: "Failed to end the game." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: whichCameFirstOptions.queryKey })
        },
    });
};


export const useResetWCFStatsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postResetWhichCameFirstStats,
        meta: {
            errorToastMessage: "Failed to reset statistics.",
            successToastMessage: "Which Came First statistics reset.",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: whichCameFirstOptions.queryKey });
        },
    });
};
