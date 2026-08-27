import {Activity} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {mediaTypeMediaIdSchema, paginationSchema} from "@/lib/schemas";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {CommunityActivityList, CommunityActivityStats} from "@/lib/client/components/media/base/MediaCommunityActivity";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/community")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: paginationSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, mediaId }, deps: { search } }) => ({
        communityActivityQueryOptions: mediaCommunityActivityOptions(mediaId, mediaType, { page: search.page ?? 1, perPage: 24 }),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.communityActivityQueryOptions);
    },
    component: MediaCommunityActivityPage,
});


function MediaCommunityActivityPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { mediaType } = Route.useParams();
    const { communityActivityQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(communityActivityQueryOptions).data;

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
                        variant="viewAll"
                        items={apiData.items}
                        mediaType={mediaType}
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
