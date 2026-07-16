import {MediaType} from "@/lib/utils/enums";
import {mediaDetailsRootKey} from "@/lib/client/react-query/query-options";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postEditMediaDetails, postUpdateBookCover, refreshMediaDetails, resolveExternalMedia} from "@/lib/server/functions/media-details";


export const useRefreshMediaMutation = (mediaType: MediaType, mediaId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: refreshMediaDetails,
        meta: {
            successToastMessage: "Metadata refreshed successfully!",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsRootKey(mediaType, mediaId) });
        },
    });
};


export const useEditMediaMutation = (meta?: MutationMeta) => {
    return useMutation({
        mutationFn: postEditMediaDetails,
        meta: { ...meta },
    });
};


export const useUpdateBookCoverMutation = (mediaId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateBookCover,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsRootKey(MediaType.BOOKS, mediaId) });
        },
    });
};


export const useAddMediaToCollectionMutation = () => {
    return useMutation({
        mutationFn: resolveExternalMedia,
    });
};
