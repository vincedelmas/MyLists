import {Activity} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {mediaTypeMediaIdSchema, SearchType} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {CommunityActivityList, CommunityActivityStats} from "@/lib/client/components/media/base/MediaCommunityActivity";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/community")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { mediaType, mediaId }, deps: { search } }) => {
        const page = search.page ?? 1;
        await queryClient.ensureQueryData(mediaCommunityActivityOptions(mediaId, mediaType, { page, perPage: 24 }));
    },
    component: MediaCommunityActivityPage,
});


function MediaCommunityActivityPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { mediaType, mediaId } = Route.useParams();
    const apiData = useSuspenseQuery(mediaCommunityActivityOptions(mediaId, mediaType, { ...filters, perPage: 24 })).data;

    const onPageChange = async (nextPage: number) => {
        await navigate({ search: { page: nextPage } });
    };

    return (
        <PageTitle title="Community Activity" subtitle={`${apiData.total} users for this media`}>
            {apiData.total === 0 ?
                <EmptyState
                    iconSize={40}
                    icon={Activity}
                    className="py-20"
                    message="No visible community activity found for this media."
                />
                :
                <div className="space-y-4">
                    <CommunityActivityStats
                        stats={apiData.stats}
                        mediaType={mediaType}
                    />
                    <CommunityActivityList
                        items={apiData.items}
                        mediaType={mediaType}
                        variant="viewAll"
                    />
                    <Pagination
                        totalPages={apiData.pages}
                        onChangePage={onPageChange}
                        currentPage={filters.page ?? 1}
                    />
                </div>
            }
        </PageTitle>
    );
}
