import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {statusUtils} from "@/lib/utils/media-mapping";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Header} from "@/lib/client/components/media/base/Header";
import {MediaListArgs, mediaListSearchSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MediaGrid} from "@/lib/client/components/media/base/MediaGrid";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import MediaTable from "@/lib/client/components/media/base/MediaTable";
import {AppliedFilters} from "@/lib/client/components/media/base/AppliedFilters";
import {FiltersSideSheet} from "@/lib/client/components/media/base/FiltersSideSheet";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/")({
    validateSearch: mediaListSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, username }, deps: { search } }) => ({
        mediaListQueryOptions: mediaListOptions(mediaType, username, search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.mediaListQueryOptions);
    },
    component: MediaList,
});


function MediaList() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username, mediaType } = Route.useParams();
    const allStatuses = statusUtils.byMediaType(mediaType);
    const { mediaListQueryOptions } = Route.useRouteContext();
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const { userData, ...apiData } = useSuspenseQuery(mediaListQueryOptions).data;

    const isCurrent = (currentUser?.id === userData.id);
    const isGrid = filters.view ? filters.view === "grid" : (currentUser?.gridListView ?? true);

    const handleGridToggle = () => {
        void navigate({
            search: (prev) => ({ ...prev, view: isGrid ? "list" : "grid" }),
            replace: true,
        });
    };

    const handleFilterChange = (newFilters: Partial<MediaListArgs>) => {
        const page = newFilters.page || 1;
        void navigate({
            search: (prev) => {
                const updatedSearch = { ...prev };

                Object.entries(newFilters).forEach(([key, item]) => {
                    const typedKey = key as keyof MediaListArgs;
                    const prevValue = prev[typedKey];

                    if (item === false || item === null || (Array.isArray(item) && item.length === 0)) {
                        delete updatedSearch[typedKey];
                    }
                    else if (Array.isArray(prevValue) && Array.isArray(item)) {
                        const oldSet = new Set(prevValue);
                        const newSet = new Set(item);
                        const toAdd = item.filter((i) => !oldSet.has(i));
                        const toKeep = prevValue.filter((i) => !newSet.has(i));
                        const merged = [...toKeep, ...toAdd];
                        if (merged.length === 0) {
                            delete updatedSearch[typedKey];
                        }
                        else {
                            updatedSearch[typedKey] = merged as any;
                        }
                    }
                    else {
                        updatedSearch[typedKey] = item as any;
                    }
                });

                return { ...updatedSearch, page };
            },
            resetScroll: false,
        });
    };

    return (
        <PageTitle title={`${username} ${capitalize(mediaType)} List`} onlyHelmet>
            <Header
                isGrid={isGrid}
                filters={filters}
                allStatuses={allStatuses}
                onGridClick={handleGridToggle}
                pagination={apiData.results.pagination}
                onFilterClick={() => setFiltersPanelOpen(true)}
                onSortChange={({ sorting }) => handleFilterChange({ sorting })}
                onStatusChange={({ status }) => handleFilterChange({ status })}
            />
            <AppliedFilters
                filters={filters}
                mediaType={mediaType}
                totalItems={apiData.results.pagination.totalItems}
                onFilterRemove={(filters) => handleFilterChange(filters)}
            />
            <div className="animate-in fade-in duration-500 mt-2">
                {isGrid ?
                    <MediaGrid
                        isCurrent={isCurrent}
                        mediaType={mediaType}
                        mediaItems={apiData.results.items}
                        queryOption={mediaListOptions(mediaType, username, filters)}
                    />
                    :
                    <MediaTable
                        filters={filters}
                        mediaType={mediaType}
                        isCurrent={isCurrent}
                        results={apiData.results}
                        queryOption={mediaListOptions(mediaType, username, filters)}
                        onChangePage={(filters) => handleFilterChange(filters)}
                    />
                }
            </div>

            {isGrid &&
                <div className="mt-8">
                    <Pagination
                        currentPage={apiData.results.pagination.page}
                        totalPages={apiData.results.pagination.totalPages}
                        onChangePage={(page) => handleFilterChange({ page })}
                    />
                </div>
            }

            <FiltersSideSheet
                filters={filters}
                username={username}
                mediaType={mediaType}
                isCurrent={isCurrent}
                open={filtersPanelOpen}
                onOpenChange={setFiltersPanelOpen}
                onFilterApply={(filters) => handleFilterChange(filters)}
            />
        </PageTitle>
    );
}
