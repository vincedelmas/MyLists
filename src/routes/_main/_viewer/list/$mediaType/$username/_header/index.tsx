import {useState, useRef} from "react";
import {MediaListArgs} from "@/lib/schemas";
import {statusUtils} from "@/lib/utils/media-mapping";
import {capitalize} from "@/lib/utils/text-formatting";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery, useQueryClient} from "@tanstack/react-query";
import {Header} from "@/lib/client/components/media/base/Header";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MediaGrid} from "@/lib/client/components/media/base/MediaGrid";
import {MediaTable} from "@/lib/client/components/media/base/MediaTable";
import {AppliedFilters} from "@/lib/client/components/media/base/AppliedFilters";
import {FiltersSideSheet} from "@/lib/client/components/media/base/FiltersSideSheet";
import {mediaListOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/")({
    validateSearch: (search) => search as MediaListArgs & { view?: "grid" | "list" },
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { mediaType, username }, deps: { search } }) => {
        return queryClient.ensureQueryData(mediaListOptions(mediaType, username, search));
    },
    component: MediaList,
});


function MediaList() {
    const filters = Route.useSearch();
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username, mediaType } = Route.useParams();
    const allStatuses = statusUtils.byMediaType(mediaType);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const { userData, ...apiData } = useSuspenseQuery(mediaListOptions(mediaType, username, filters)).data;

    const isCurrent = (currentUser?.id === userData.id);
    const isGrid = filters.view ? filters.view === "grid" : (currentUser?.gridListView ?? true);

    const handleGridToggle = () => {
        void navigate({
            search: (prev) => ({ ...prev, view: isGrid ? "list" : "grid" }),
            replace: true,
        });
    };

    const prevMediaIdRef = useRef<number | null>(null);

    const handleSurpriseMe = async () => {
        const totalItems = apiData.results.pagination.totalItems;
        if (totalItems === 0) return;

        const perPage = 50;

        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * totalItems);
            const targetPage = Math.floor(randomIndex / perPage) + 1;
            const itemIndex = randomIndex % perPage;

            const items = (await queryClient.fetchQuery(
                mediaListOptions(mediaType, username, { ...filters, page: targetPage, perPage })
            )).results.items;

            const item = items[itemIndex];
            if (item && item.mediaId !== prevMediaIdRef.current) {
                prevMediaIdRef.current = item.mediaId;
                window.open(`/details/${mediaType}/${item.mediaId}`, '_blank');
                return;
            }
        }
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
                onSurpriseMeClick={handleSurpriseMe}
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

            {filtersPanelOpen &&
                <FiltersSideSheet
                    filters={filters}
                    username={username}
                    mediaType={mediaType}
                    isCurrent={isCurrent}
                    onClose={() => setFiltersPanelOpen(false)}
                    onFilterApply={(filters) => handleFilterChange(filters)}
                />
            }
        </PageTitle>
    );
}
