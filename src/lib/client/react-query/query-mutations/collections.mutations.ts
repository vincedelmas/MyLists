import {MutationMeta, type QueryClient, useMutation, useQueryClient} from "@tanstack/react-query";
import {collectionDetailsEditOptions, CollectionDetailsReadData, collectionDetailsReadQueryKey} from "@/lib/client/react-query/query-options/collections.options";
import {
    postAddMediaToCollection,
    postCopyCollection,
    postCreateCollection,
    postDeleteCollection,
    postRemoveMediaFromCollection,
    postToggleCollectionLike,
    postUpdateCollection
} from "@/lib/server/functions/collections";


const invalidateCollectionSummaries = (queryClient: QueryClient) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["collections", "user"] }),
    queryClient.invalidateQueries({ queryKey: ["collections", "community"] }),
    queryClient.invalidateQueries({ queryKey: ["collections", "memberships"] }),
    queryClient.invalidateQueries({ queryKey: ["details", "collections", "community"] }),
    queryClient.invalidateQueries({ queryKey: ["profile-pins"] }),
]);


const invalidateCollectionItems = (queryClient: QueryClient, collectionId: number, refetchType: "active" | "none" = "active") => Promise.all([
    invalidateCollectionSummaries(queryClient),
    queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId), refetchType }),
    queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey, refetchType }),
]);


export const useCreateCollectionMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCreateCollection,
        meta: {
            successToastMessage: "New collection created!",
            ...meta,
        },
        onSuccess: () => invalidateCollectionSummaries(queryClient),
    });
};


export const useUpdateCollectionMutation = (collectionId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateCollection,
        meta: {
            successToastMessage: "Collection updated successfully!",
            ...meta,
        },
        onSuccess: () => {
            return invalidateCollectionItems(queryClient, collectionId);
        },
    });
};


export const useDeleteCollectionMutation = (collectionId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postDeleteCollection,
        meta: {
            successToastMessage: "Collection deleted successfully!",
            ...meta,
        },
        onSuccess: () => invalidateCollectionItems(queryClient, collectionId, "none"),
    });
};


export const useToggleCollectionLikeMutation = (collectionId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postToggleCollectionLike,
        onSuccess: ({ isLiked, likeCount }) => {
            queryClient.setQueriesData<CollectionDetailsReadData>({ queryKey: collectionDetailsReadQueryKey(collectionId) }, (oldData) => {
                if (!oldData) return;
                return {
                    ...oldData,
                    isLiked,
                    collection: {
                        ...oldData.collection,
                        likeCount,
                    }
                }
            });

            return invalidateCollectionSummaries(queryClient);
        },
    });
};


export const useCopyCollectionMutation = (collectionId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCopyCollection,
        meta: { successToastMessage: "Collection copied successfully!" },
        onSuccess: () => Promise.all([
            invalidateCollectionSummaries(queryClient),
            queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) }),
        ]),
    });
};


export const useAddMediaToCollectionMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediaToCollection,
        meta: { ...meta },
        onSuccess: (_data, variables) => {
            return invalidateCollectionItems(queryClient, Number(variables.data.collectionId));
        },
    });
};


export const useRemoveMediaFromCollectionMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRemoveMediaFromCollection,
        meta: { ...meta },
        onSuccess: (_data, variables) => {
            return invalidateCollectionItems(queryClient, Number(variables.data.collectionId));
        },
    });
};
