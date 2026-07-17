import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {capitalize} from "@/lib/utils/text-formatting";
import {mediaTypeMediaIdSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {editMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {CatalogEditKindBoundary} from "@/lib/client/components/features/catalog-edit/CatalogEditKindBoundary";


export const Route = createFileRoute("/_main/_private/details/edit/$mediaType/$mediaId")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: ({ context: { queryClient }, params: { mediaType, mediaId } }) =>
        queryClient.ensureQueryData(editMediaDetailsOptions(mediaType, mediaId)),
    component: MediaEditPage,
});


function MediaEditPage() {
    const { mediaType, mediaId } = Route.useParams();
    const apiData = useSuspenseQuery(editMediaDetailsOptions(mediaType, mediaId)).data;

    return (
        <PageTitle title={`Edit ${capitalize(apiData.kind)} Details`} subtitle="Update the media information">
            <CatalogEditKindBoundary mediaId={mediaId} data={apiData}/>
        </PageTitle>
    );
}
