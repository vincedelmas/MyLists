import {mediaTypeApiIdSchema} from "@/lib/schemas";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {mediaExternalOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/external/$apiId")({
    params: {
        parse: (params) => {
            const result = mediaTypeApiIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: async ({ context: { queryClient }, params: { mediaType, apiId } }) => {
        const { mediaId } = await queryClient.fetchQuery(mediaExternalOptions(mediaType, apiId));

        throw redirect({
            params: { mediaType, mediaId },
            to: "/details/$mediaType/$mediaId",
        });
    },
});
