import {MediaType} from "@/lib/utils/enums";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {getMediaDetails, postEditMediaDetails, postUpdateBookCover, refreshMediaDetails} from "@/lib/server/functions/media-details";


export const useRefreshMediaMutation = (mediaType: MediaType, mediaOrApiId: number | string, external: boolean) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: refreshMediaDetails,
        meta: {
            errorToastMessage: "Failed to refresh media details.",
            successToastMessage: "Metadata refreshed successfully!",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaOrApiId.toString(), external).queryKey });
        },
    });
};


export const useEditMediaMutation = () => {
    return useMutation({
        mutationFn: postEditMediaDetails,
        meta: { errorToastMessage: "Failed to edit this media." },
    });
};


export const useUpdateBookCoverMutation = (mediaOrApiId: number | string, external: boolean, meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postUpdateBookCover,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(MediaType.BOOKS, mediaOrApiId.toString(), external).queryKey });
        },
    });
};


export const useAddMediaToCollectionMutation = () => {
    return useMutation({
        mutationFn: getMediaDetails,
        meta: { errorToastMessage: "Failed to add media to collection." },
    });
};
