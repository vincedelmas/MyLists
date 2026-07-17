import {useState} from "react";
import {MediaListArgs, mediaListSearchSchema} from "@/lib/schemas";
import {statusUtils} from "@/lib/utils/media-mapping";
import {capitalize} from "@/lib/utils/text-formatting";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Header} from "@/lib/client/components/media/base/Header";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {AppliedFilters} from "@/lib/client/components/media/base/AppliedFilters";
import {FiltersSideSheet} from "@/lib/client/components/media/base/FiltersSideSheet";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {MediaListKindBoundary} from "@/lib/client/components/features/media-list/MediaListKindBoundary";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/")({
    validateSearch: mediaListSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { mediaType, username }, deps: { search } }) => {
        return queryClient.ensureQueryData(mediaListOptions(mediaType, username, search));
    },
    component: MediaList,
});


function MediaList() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username, mediaType } = Route.useParams();
    const allStatuses = statusUtils.byMediaType(mediaType);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const queryOption = mediaListOptions(mediaType, username, filters);
    const apiData = useSuspenseQuery(queryOption).data;

    const isCurrent = (currentUser?.id === apiData.userData.id);
    const isGrid = filters.view ? filters.view === "grid" : (currentUser?.gridListView ?? true);

    const handleGridToggle = () => {
        void navigate({
            search: (prev) => ({ ...prev, view: isGrid ? "list" : "grid" }),
            replace: true,
        });
    };

    const handleFilterChange = (newFilters: Partial<MediaListArgs>) => {
        void navigate({
            search: (prev) => mergeListSearch(prev, newFilters),
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
                <MediaListKindBoundary
                    page={apiData.results}
                    filters={filters}
                    isCurrent={isCurrent}
                    isGrid={isGrid}
                    queryOption={queryOption}
                    onChangePage={handleFilterChange}
                />
            </div>

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


const mergeListSearch = (
    current: MediaListArgs & { view?: "grid" | "list" },
    changes: Partial<MediaListArgs>,
): MediaListArgs & { view?: "grid" | "list" } => ({
    ...current,
    page: changes.page ?? 1,
    perPage: changes.perPage ?? current.perPage,
    sorting: changes.sorting ?? current.sorting,
    search: changes.search === undefined ? current.search : changes.search || undefined,
    favorite: changes.favorite === undefined ? current.favorite : changes.favorite || undefined,
    comment: changes.comment === undefined ? current.comment : changes.comment || undefined,
    hideCommon: changes.hideCommon === undefined ? current.hideCommon : changes.hideCommon || undefined,
    status: toggleFilterValues(current.status, changes.status),
    genres: toggleFilterValues(current.genres, changes.genres),
    tags: toggleFilterValues(current.tags, changes.tags),
    langs: toggleFilterValues(current.langs, changes.langs),
    directors: toggleFilterValues(current.directors, changes.directors),
    publishers: toggleFilterValues(current.publishers, changes.publishers),
    actors: toggleFilterValues(current.actors, changes.actors),
    authors: toggleFilterValues(current.authors, changes.authors),
    companies: toggleFilterValues(current.companies, changes.companies),
    networks: toggleFilterValues(current.networks, changes.networks),
    creators: toggleFilterValues(current.creators, changes.creators),
    platforms: toggleFilterValues(current.platforms, changes.platforms),
});


const toggleFilterValues = <T extends string>(current: T[] | undefined, changes: T[] | undefined): T[] | undefined => {
    if (changes === undefined) return current;
    if (changes.length === 0) return undefined;

    const changedValues = new Set(changes);
    const currentValues = new Set(current ?? []);
    const retained = (current ?? []).filter((value) => !changedValues.has(value));
    const added = changes.filter((value) => !currentValues.has(value));
    const result = [...retained, ...added];
    return result.length > 0 ? result : undefined;
};
