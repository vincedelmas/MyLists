import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api, type MediaParams} from "../../lib/api-client";


export function useMediaAction(params: MediaParams) {
    const client = useQueryClient();

    return useMutation({
        mutationFn: (input: Parameters<typeof api.mediaAction>[1]) => api.mediaAction(params, input),
        onSuccess: async (_result, input) => {
            if (input.action !== "collection" && input.action !== "create-collection") await client.invalidateQueries({
                queryKey: ["media", params.mediaType, params.mediaId],
                exact: true
            });
            if (input.action === "tag") await client.invalidateQueries({ queryKey: ["media-tags", params.mediaType] });
            if (input.action === "collection" || input.action === "create-collection") {
                await Promise.all([
                    client.invalidateQueries({ queryKey: ["media", params.mediaType, params.mediaId, "collections"] }),
                    client.invalidateQueries({
                        queryKey: ["lists", "library"],
                        refetchType: "none"
                    })
                ]);
            }
            if (input.action === "cover" || input.action === "book-cover" || input.action === "tag") await client.invalidateQueries({
                queryKey: ["lists", params.mediaType],
                refetchType: "none"
            });
        },
    });
}
