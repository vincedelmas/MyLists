import {MediaType} from "@/lib/utils/enums";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postEditMediaDetails, postUpdateBookCover, refreshMediaDetails, resolveExternalMedia} from "@/lib/server/functions/media-details";
import {invalidateCatalogMutationEffects} from "@/lib/client/react-query/query-mutations/catalog-cache-effects";
import {catalogEditRequestSchema} from "@/lib/contracts/media/catalog-edit";


export const useRefreshMediaMutation = (mediaType: MediaType, mediaId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: refreshMediaDetails,
        meta: {
            successToastMessage: "Metadata refreshed successfully!",
        },
        onSuccess: async () => {
            await invalidateCatalogMutationEffects(queryClient, "refresh", mediaType, mediaId);
        },
    });
};


export const useEditMediaMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postEditMediaDetails,
        meta: { ...meta },
        onSuccess: async (_data, variables) => {
            const { mediaType, mediaId } = catalogEditRequestSchema.parse(variables.data);
            await invalidateCatalogMutationEffects(queryClient, "edit", mediaType, mediaId);
        },
    });
};


export const useUpdateBookCoverMutation = (mediaId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateBookCover,
        meta: { ...meta },
        onSuccess: async () => {
            await invalidateCatalogMutationEffects(queryClient, "cover", MediaType.BOOKS, mediaId);
        },
    });
};


export const useAddMediaToCollectionMutation = () => {
    return useMutation({
        mutationFn: resolveExternalMedia,
    });
};
