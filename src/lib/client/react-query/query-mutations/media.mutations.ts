import {MediaType} from "@/lib/utils/enums";
import {mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {postEditMediaDetails, postUpdateBookCover, refreshMediaDetails, resolveExternalMedia} from "@/lib/server/functions/media-details";


export const useRefreshMediaMutation = (mediaType: MediaType, mediaId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: refreshMediaDetails,
        meta: {
            errorToastMessage: "Failed to refresh media details.",
            successToastMessage: "Metadata refreshed successfully!",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaId).queryKey });
        },
    });
};


export const useEditMediaMutation = () => {
    return useMutation({
        mutationFn: postEditMediaDetails,
        meta: { errorToastMessage: "Failed to edit this media." },
    });
};


export const useUpdateBookCoverMutation = (mediaId: number, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateBookCover,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(MediaType.BOOKS, mediaId).queryKey });
        },
    });
};


export const useAddMediaToCollectionMutation = () => {
    return useMutation({
        mutationFn: resolveExternalMedia,
        meta: { errorToastMessage: "Failed to add media to collection." },
    });
};
