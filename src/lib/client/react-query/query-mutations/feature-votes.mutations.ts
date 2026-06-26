import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";
import {featureVotesOptions} from "@/lib/client/react-query/query-options";
import {postAdminDeleteFeatureRequest, postAdminUpdateFeatureStatus, postCreateFeatureRequest, postToggleFeatureVote} from "@/lib/server/functions/feature-votes";


export const useCreateFeatureRequestMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postCreateFeatureRequest,
        meta: {
            errorToastMessage: "Failed to submit feature request.",
            successToastMessage: "Feature request submitted successfully!",
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: featureVotesOptions.queryKey });
        },
    });
};


export const useToggleFeatureVoteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postToggleFeatureVote,
        meta: { errorToastMessage: "Failed to toggle feature vote." },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: featureVotesOptions.queryKey });
        },
    });
};


export const useAdminUpdateFeatureMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminUpdateFeatureStatus,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: featureVotesOptions.queryKey });
        },
    });
};


export const useAdminDeleteFeatureMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postAdminDeleteFeatureRequest,
        meta: { ...meta },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: featureVotesOptions.queryKey });
        },
    });
};
