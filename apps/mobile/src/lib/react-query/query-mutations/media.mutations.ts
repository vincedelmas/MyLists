import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api, type MediaParams, type UpdateInput} from "../../api-client";


type TrackingChange =
    | { action: "add"; status?: string }
    | { action: "remove" }
    | { action: "update"; input: Omit<UpdateInput, "mediaType" | "mediaId"> };


export const useTrackingMutation = (params: MediaParams) => {
    const client = useQueryClient();

    return useMutation({
        mutationFn: async (change: TrackingChange) => {
            if (change.action === "add") return api.addMedia(params, change.status);
            if (change.action === "remove") return api.removeMedia(params);

            return api.updateMedia({ ...params, ...change.input });
        },
        onSuccess: async (result) => {
            if (result.kind !== "saved") return;

            await Promise.all([
                client.invalidateQueries({
                    queryKey: ["media", params.mediaType, params.mediaId],
                    exact: true
                }),
                client.invalidateQueries({ queryKey: ["media", params.mediaType, params.mediaId, "history"] }),
                client.invalidateQueries({
                    queryKey: ["media", params.mediaType, params.mediaId, "community"],
                    refetchType: "none"
                }),
                client.invalidateQueries({
                    queryKey: ["lists", params.mediaType],
                    refetchType: "none"
                }),
                client.invalidateQueries({
                    queryKey: ["lists", "summary"],
                    refetchType: "none"
                }),
                client.invalidateQueries({
                    queryKey: ["lists", "library"],
                    refetchType: "none"
                }),
                ...["profile", "search", "monthly-activity", "media-job"].map(key => client.invalidateQueries({
                    queryKey: [key],
                    refetchType: "none"
                })),
            ]);
        },
    });
};


type ResolveMutation = { mediaType: MediaParams["mediaType"]; apiId: string | number };


export const useResolveMutation = () =>
    useMutation({
        mutationFn: ({ mediaType, apiId }: ResolveMutation) => api.resolve(mediaType, apiId),
    });


export function useMediaRefreshMutation(params: MediaParams) {
    const client = useQueryClient();

    return useMutation({
        mutationFn: () => api.refreshMedia(params),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: ["media", params.mediaType, params.mediaId] });
        },
    });
}


export function useMediaEditMutation() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: api.saveMediaEdit,
        onSuccess: async (_result, params) => {
            await Promise.all([
                client.invalidateQueries({ queryKey: ["media", params.mediaType, params.mediaId] }),
                ...["lists", "search", "media-job"].map(key => client.invalidateQueries({
                    queryKey: [key],
                    refetchType: "none"
                })),
            ]);
        },
    });
}
