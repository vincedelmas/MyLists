import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api, type MediaParams, type UpdateInput} from "../../api-client";

export const useTrackingMutation = (params: MediaParams) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: async (
            change:
                | {action: "add"; status?: string}
                | {action: "remove"}
                | {action: "update"; input: Omit<UpdateInput, "mediaType" | "mediaId">},
        ) => {
            if (change.action === "add") return api.addMedia(params, change.status);
            if (change.action === "remove") return api.removeMedia(params);
            return api.updateMedia({...params, ...change.input});
        },
        onSuccess: async (result) => {
            if (result.kind !== "saved") return;
            await Promise.all(
                ["media", "lists", "profile", "search"].map((key) => client.invalidateQueries({queryKey: [key]})),
            );
        },
    });
};

export const useResolveMutation = () =>
    useMutation({
        mutationFn: ({mediaType, apiId}: {mediaType: MediaParams["mediaType"]; apiId: string | number}) =>
            api.resolve(mediaType, apiId),
    });
