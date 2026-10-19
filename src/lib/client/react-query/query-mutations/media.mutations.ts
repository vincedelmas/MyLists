import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {postCreateBook} from "@/lib/server/functions/books";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {mediaDetailsOptions, profileOptions} from "@/lib/client/react-query/query-options";
import {invalidateUserProgressQueries} from "@/lib/client/react-query/query-mutations/invalidate-user-progress";
import {postEditMediaDetails, postUpdateBookCover, refreshMediaDetails, resolveExternalMedia} from "@/lib/server/functions/media-details";


export const useRefreshMediaMutation = (mediaType: MediaType, mediaId: number, onSuccess?: () => void) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: refreshMediaDetails,
        meta: {
            successToastMessage: "Metadata refreshed successfully!",
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["admin", "missing-covers"] }),
                queryClient.invalidateQueries({ queryKey: ["release-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["userList", mediaType] }),
                queryClient.invalidateQueries({ queryKey: ["tvSeasons", mediaType, mediaId] }),
                queryClient.invalidateQueries({ queryKey: mediaDetailsOptions(mediaType, mediaId).queryKey }),
            ]);
            onSuccess?.();
        },
    });
};


export const useEditMediaMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postEditMediaDetails,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["release-calendar"] });
        },
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


export const useResolveExternalMediaMutation = () => {
    return useMutation({
        mutationFn: resolveExternalMedia,
    });
};


export const useCreateBookMutation = () => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCreateBook,
        meta: {
            noErrorToast: true,
            successToastMessage: "Book created and added to your list!",
        },
        onSuccess: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: profileOptions(currentUser!.name).queryKey }),
            invalidateUserProgressQueries(queryClient, currentUser!.name),
            queryClient.invalidateQueries({ queryKey: ["monthly-activity"] }),
            queryClient.invalidateQueries({ queryKey: ["year-recap"] }),
            queryClient.invalidateQueries({ queryKey: ["userList", MediaType.BOOKS] }),
            queryClient.invalidateQueries({ queryKey: ["listFilters", MediaType.BOOKS, currentUser!.name] }),
            queryClient.invalidateQueries({ queryKey: ["navSearch"] }),
        ]),
    });
};
