import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {postCreateDynamicList, postDeleteDynamicList, postUpdateDynamicList} from "@/lib/server/functions/dynamic-lists";


export const useSaveDynamicListMutation = (listId?: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (spec: DynamicListSpec) => listId === undefined
            ? postCreateDynamicList({ data: spec })
            : postUpdateDynamicList({ data: { id: listId, spec } }),
        meta: { successToastMessage: listId === undefined ? "Dynamic list created!" : "Dynamic list updated!" },
        onSuccess: () => {
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: ["profile-pins", "profile"] }),
                queryClient.invalidateQueries({ queryKey: ["dynamic-lists"] }),
            ])
        },
    });
};


export const useDeleteDynamicListMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (listId: number) => postDeleteDynamicList({ data: { id: listId } }),
        meta: { successToastMessage: "Dynamic list deleted." },
        onSuccess: (_data, listId) => Promise.all([
            queryClient.invalidateQueries({ queryKey: ["profile-pins"] }),
            queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "user"] }),
            queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "details", listId], refetchType: "none" }),
            queryClient.invalidateQueries({ queryKey: ["dynamic-lists", "editor", listId], refetchType: "none" }),
        ]),
    });
};
