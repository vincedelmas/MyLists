import {MediaType} from "@/lib/utils/enums";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {mediaExternalOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/external/$apiId")({
    params: { parse: (params) => ({ mediaType: params.mediaType as MediaType, apiId: params.apiId }) },
    loader: async ({ context: { queryClient }, params: { mediaType, apiId } }) => {
        const { mediaId } = await queryClient.fetchQuery(mediaExternalOptions(mediaType, apiId));

        throw redirect({
            params: { mediaType, mediaId },
            to: "/details/$mediaType/$mediaId",
        });
    },
});
