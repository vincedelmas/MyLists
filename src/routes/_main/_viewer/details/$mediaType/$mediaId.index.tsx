import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MediaDetailsKindBoundary} from "@/lib/client/features/media-details/MediaDetailsKindBoundary";
import {authOptions, mediaCommunityActivityOptions, mediaCommunityCollectionsOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: async ({ context: { queryClient }, params: { mediaType, mediaId } }) => {
        const currentUser = await queryClient.ensureQueryData(authOptions);
        const viewerId = currentUser?.id ?? null;

        const details = await queryClient.ensureQueryData(mediaDetailsOptions(mediaType, mediaId, viewerId));
        void queryClient.prefetchQuery(mediaCommunityCollectionsOptions(details.media.id, mediaType));
        void queryClient.prefetchQuery(mediaCommunityActivityOptions(details.media.id, mediaType, viewerId, { page: 1, perPage: 8 }));
    },
    component: MediaDetailsPage,
});


function MediaDetailsPage() {
    const { currentUser } = useAuth();
    const { mediaType, mediaId } = Route.useParams();
    const detailsQuery = mediaDetailsOptions(mediaType, mediaId, currentUser?.id ?? null);
    const details = useSuspenseQuery(detailsQuery).data;

    return (
        <MediaDetailsKindBoundary
            details={details}
            queryOption={detailsQuery}
        />
    );
}
