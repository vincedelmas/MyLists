import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {postCreateSmartView, postDeleteSmartView, postSetProfileSmartViews, postUpdateSmartView} from "@/lib/server/functions/smart-views";


export const useSaveSmartViewMutation = (viewId?: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (spec: SmartViewSpec) => viewId === undefined
            ? postCreateSmartView({ data: spec })
            : postUpdateSmartView({ data: { id: viewId, spec } }),
        meta: { successToastMessage: viewId === undefined ? "Smart list created!" : "Smart list updated!" },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["smart-views"] }),
    });
};


export const useDeleteSmartViewMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (viewId: number) => postDeleteSmartView({ data: { id: viewId } }),
        meta: { successToastMessage: "Smart list deleted." },
        onSuccess: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: ["smart-views", "list"] }),
            queryClient.invalidateQueries({ queryKey: ["smart-views", "profile"] }),
            queryClient.invalidateQueries({ queryKey: ["smart-views", "user"] }),
        ]),
    });
};


export const useSetProfileSmartViewsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["smart-views", "pins"],
        mutationFn: (ids: number[]) => postSetProfileSmartViews({ data: { ids } }),
        meta: { successToastMessage: "Profile pins updated!" },
        onSuccess: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: ["smart-views", "list"] }),
            queryClient.invalidateQueries({ queryKey: ["smart-views", "profile"] }),
            queryClient.invalidateQueries({ queryKey: ["smart-views", "details"] }),
            queryClient.invalidateQueries({ queryKey: ["smart-views", "user"] }),
        ]),
    });
};
