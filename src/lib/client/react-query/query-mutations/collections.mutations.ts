import {MutationMeta, type QueryClient, useMutation, useQueryClient} from "@tanstack/react-query";
import {collectionDetailsEditOptions, CollectionDetailsReadData, collectionDetailsReadQueryKey} from "@/lib/client/react-query/query-options";
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
        onSuccess: () => Promise.all([
            invalidateCollectionSummaries(queryClient),
            queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) }),
            queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey }),
        ]),
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
        onSuccess: () => Promise.all([
            invalidateCollectionSummaries(queryClient),
            queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) }),
        ]),
    });
};


export const useToggleCollectionLikeMutation = (collectionId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postToggleCollectionLike,
        onSuccess: () => {
            queryClient.setQueriesData<CollectionDetailsReadData>({ queryKey: collectionDetailsReadQueryKey(collectionId) }, (oldData) => {
                if (!oldData) return;
                return {
                    ...oldData,
                    isLiked: !oldData.isLiked,
                    collection: {
                        ...oldData.collection,
                        likeCount: oldData.isLiked ? oldData.collection.likeCount - 1 : oldData.collection.likeCount + 1,
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
            const collectionId = Number(variables.data.collectionId);
            return Promise.all([
                invalidateCollectionSummaries(queryClient),
                queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) }),
                queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey }),
            ]);
        },
    });
};


export const useRemoveMediaFromCollectionMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRemoveMediaFromCollection,
        meta: { ...meta },
        onSuccess: (_data, variables) => {
            const collectionId = Number(variables.data.collectionId);
            return Promise.all([
                invalidateCollectionSummaries(queryClient),
                queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) }),
                queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey }),
            ]);
        },
    });
};
