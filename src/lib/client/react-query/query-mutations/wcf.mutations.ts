import {useMutation, useQueryClient} from "@tanstack/react-query";
import {whichCameFirstOptions} from "@/lib/client/react-query/query-options";
import {postAbandonWhichCameFirstRun, postAnswerWhichCameFirstRound, postResetWhichCameFirstStats, postStartWhichCameFirstRun} from "@/lib/server/functions/which-came-first";


export const useStartWCFRunMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postStartWhichCameFirstRun,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: whichCameFirstOptions.queryKey });
        },
    });
};


export const useAnswerWCFRoundMutation = () => useMutation({
    mutationFn: postAnswerWhichCameFirstRound,
});


export const useAbandonWCFRunMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAbandonWhichCameFirstRun,
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
            successToastMessage: "Which Came First statistics reset.",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: whichCameFirstOptions.queryKey });
        },
    });
};
