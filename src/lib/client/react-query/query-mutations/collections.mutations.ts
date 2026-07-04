import {MediaType} from "@/lib/utils/enums";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {
    collectionDetailsEditOptions,
    collectionDetailsReadOptions,
    mediaCommunityCollectionsOptions,
    userCollectionMembershipsOptions
} from "@/lib/client/react-query/query-options";
import {
    postAddMediaToCollection,
    postCopyCollection,
    postCreateCollection,
    postDeleteCollection,
    postRemoveMediaFromCollection,
    postToggleCollectionLike,
    postUpdateCollection
} from "@/lib/server/functions/collections";


export const useCreateCollectionMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCreateCollection,
        meta: {
            successToastMessage: "New collection created!",
            ...meta,
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["collections", "user"] });
            await queryClient.invalidateQueries({ queryKey: ["collections", "community"] });
        },
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
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["collections", "user"] });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsReadOptions(collectionId).queryKey });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey });
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
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["collections", "user"] });
            await queryClient.invalidateQueries({ queryKey: ["collections", "community"] });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsReadOptions(collectionId).queryKey });
        },
    });
};


export const useToggleCollectionLikeMutation = (collectionId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postToggleCollectionLike,
        onSuccess: async () => {
            queryClient.setQueryData(collectionDetailsReadOptions(collectionId).queryKey, (oldData) => {
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

            await queryClient.invalidateQueries({ queryKey: ["collections", "community"] });
        },
    });
};


export const useCopyCollectionMutation = (collectionId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCopyCollection,
        meta: {
            successToastMessage: "Collection copied successfully!",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["collections", "community"] });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsReadOptions(collectionId).queryKey });
        },
    });
};


export const useAddMediaToCollectionMutation = (mediaType: MediaType, mediaId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAddMediaToCollection,
        meta: { ...meta },
        onSuccess: async (_data, variables) => {
            const collectionId = Number(variables.data.collectionId);
            await queryClient.invalidateQueries({ queryKey: ["collections", "user"] });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsReadOptions(collectionId).queryKey });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey });
            await queryClient.invalidateQueries({ queryKey: mediaCommunityCollectionsOptions(mediaId, mediaType).queryKey });
            await queryClient.invalidateQueries({ queryKey: userCollectionMembershipsOptions(mediaId, mediaType, true).queryKey });
        },
    });
};


export const useRemoveMediaFromCollectionMutation = (mediaType: MediaType, mediaId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRemoveMediaFromCollection,
        meta: { ...meta },
        onSuccess: async (_data, variables) => {
            const collectionId = Number(variables.data.collectionId);
            await queryClient.invalidateQueries({ queryKey: ["collections", "user"] });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsReadOptions(collectionId).queryKey });
            await queryClient.invalidateQueries({ queryKey: collectionDetailsEditOptions(collectionId).queryKey });
            await queryClient.invalidateQueries({ queryKey: mediaCommunityCollectionsOptions(mediaId, mediaType).queryKey });
            await queryClient.invalidateQueries({ queryKey: userCollectionMembershipsOptions(mediaId, mediaType, true).queryKey });
        },
    });
};
