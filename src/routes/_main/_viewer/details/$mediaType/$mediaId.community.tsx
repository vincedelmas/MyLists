import {Activity} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {mediaTypeMediaIdSchema, simpleSearchSchema} from "@/lib/schemas";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {CommunityActivityList, CommunityActivityStats} from "@/lib/client/components/media/base/MediaCommunityActivity";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$mediaId/community")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: simpleSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, mediaId }, deps: { search } }) => ({
        communityActivityQueryOptions: mediaCommunityActivityOptions(mediaId, mediaType, { ...search, page: search.page ?? 1, perPage: 24 }),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.communityActivityQueryOptions, staleTime: "static" });
    },
    component: MediaCommunityActivityPage,
    head: () => ({ meta: [{ title: "Community Activity - MyLists" }] }),
});


function MediaCommunityActivityPage() {
    const filters = Route.useSearch();
    const { mediaType } = Route.useParams();
    const { communityActivityQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(communityActivityQueryOptions).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate({ search: filters.search ?? "" });

    return (
        <div className="flex flex-col mx-auto mb-8 pt-6">
            <PageHeader
                eyebrowIcon={Activity}
                eyebrow="Media community"
                title="Community Activity"
                description={`${apiData.total} users for this media`}
            />
            <SearchInput
                value={localSearch}
                className="mt-4 w-full"
                onChange={handleInputChange}
                placeholder="Search users..."
                aria-label="Search community activity users"
            />
            <div className="mt-4">
                {apiData.total === 0 ?
                    <EmptyState
                        iconSize={40}
                        icon={Activity}
                        className="py-20"
                        message={filters.search
                            ? `No users found for “${filters.search}”.`
                            : "No visible community activity found for this media."
                        }
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
                            currentPage={filters.page ?? 1}
                            onChangePage={(page) => updateFilters({ page })}
                        />
                    </div>
                }
            </div>
        </div>
    );
}
