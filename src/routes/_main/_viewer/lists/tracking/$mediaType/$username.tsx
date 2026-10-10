import {useEffect, useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/formatting/text";
import {Header} from "@/lib/client/components/media/base/Header";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {MediaLevel} from "@/lib/client/components/general/MediaLevel";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MediaGrid} from "@/lib/client/components/media/base/MediaGrid";
import MediaTable from "@/lib/client/components/media/base/MediaTable";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {FiltersSideSheet} from "@/lib/client/components/media/base/FiltersSideSheet";
import {ListAppliedFilters} from "@/lib/client/components/media/browse/AppliedFilters";
import type {MediaFiltersTab} from "@/lib/client/components/media/browse/MediaFiltersSheet";
import {MediaListArgs, mediaListSearchSchema, mediaTypeUsernameSchema} from "@/lib/schemas";
import {mediaListOptions, userListHeaderOption} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/lists/tracking/$mediaType/$username")({
    params: {
        parse: params => {
            const result = mediaTypeUsernameSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: mediaListSearchSchema,
    loaderDeps: ({ search: { filtersTab: _filtersTab, ...search } }) => ({ search }),
    context: ({ params: { mediaType, username }, deps: { search } }) => ({
        mediaListQueryOptions: mediaListOptions(mediaType, username, search),
        userListHeaderQueryOptions: userListHeaderOption(mediaType, username),
    }),
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(context.userListHeaderQueryOptions);
        return context.queryClient.ensureQueryData(context.mediaListQueryOptions);
    },
    component: TrackingListPage,
});


function TrackingListPage() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username, mediaType } = Route.useParams();
    const { mediaListQueryOptions, userListHeaderQueryOptions } = Route.useRouteContext();

    const { timeSpent } = useSuspenseQuery(userListHeaderQueryOptions).data;
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const { userData, ...apiData } = useSuspenseQuery(mediaListQueryOptions).data;
    const [filtersTab, setFiltersTab] = useState<MediaFiltersTab>("filters");

    const isCurrent = (currentUser?.id === userData.id);

    const lastPage = Math.max(1, apiData.results.pagination.totalPages);
    const isGrid = filters.view ? filters.view === "grid" : (currentUser?.gridListView ?? true);

    useEffect(() => {
        if ((filters.page ?? 1) > lastPage) {
            void navigate({ search: prev => ({ ...prev, page: lastPage }), replace: true, resetScroll: false });
        }
    }, [filters.page, lastPage, navigate]);

    const handleGridToggle = () => {
        void navigate({ search: prev => ({ ...prev, view: isGrid ? "list" : "grid" }), replace: true });
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
        <PageTitle title={`${username} ${capitalize(mediaType)}`} onlyHelmet>
            <div className="mb-8 flex min-w-0 flex-col gap-4 pt-8">
                <PageHeader
                    eyebrow={<ListsBackLink username={username}/>}
                    asideLabel={`${capitalize(mediaType)} level`}
                    title={isCurrent ? `Your ${capitalize(mediaType)}` : `${username}'s ${capitalize(mediaType)}`}
                    description={isCurrent
                        ? "Everything you track here, with your ratings and progress."
                        : `Everything ${username} tracks here, with their ratings and progress.`
                    }
                    asideValue={
                        <MediaLevel
                            className="text-lg"
                            mediaType={mediaType}
                            timeSpentMin={timeSpent}
                            containerClassName="mx-0"
                        />
                    }
                />

                <Header
                    trailing={<QuickActions username={username} mediaType={mediaType}/>}
                    isGrid={isGrid}
                    filters={filters}
                    onGridClick={handleGridToggle}
                    pagination={apiData.results.pagination}
                    allStatuses={getMediaDefinition(mediaType).statuses}
                    onSortChange={({ sorting }) => handleFilterChange({ sorting })}
                    onStatusChange={({ status }) => handleFilterChange({ status })}
                    onFilterClick={() => {
                        setFiltersTab("filters");
                        setFiltersPanelOpen(true);
                    }}
                />

                <ListAppliedFilters
                    filters={filters}
                    mediaType={mediaType}
                    totalItems={apiData.results.pagination.totalItems}
                    totalPages={apiData.results.pagination.totalPages}
                    onFilterRemove={(filters) => handleFilterChange(filters)}
                />

                <div className="animate-in fade-in duration-500">
                    {isGrid ?
                        <MediaGrid
                            isCurrent={isCurrent}
                            mediaType={mediaType}
                            mediaItems={apiData.results.items}
                            queryOption={mediaListQueryOptions}
                        />
                        :
                        <MediaTable
                            filters={filters}
                            mediaType={mediaType}
                            isCurrent={isCurrent}
                            results={apiData.results}
                            queryOption={mediaListQueryOptions}
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
                    activeTab={filters.filtersTab ?? filtersTab}
                    open={filtersPanelOpen || filters.filtersTab !== undefined}
                    onTabChange={tab => {
                        setFiltersTab(tab);
                        if (filters.filtersTab) {
                            void navigate({ search: prev => ({ ...prev, filtersTab: tab }), replace: true, resetScroll: false });
                        }
                    }}
                    onOpenChange={open => {
                        setFiltersPanelOpen(open);
                        if (!open && filters.filtersTab) {
                            void navigate({ search: prev => ({ ...prev, filtersTab: undefined }), replace: true, resetScroll: false });
                        }
                    }}
                    onTagChange={({ oldName, newName }) => {
                        void navigate({
                            resetScroll: false,
                            search: prev => {
                                if (!prev.tags?.includes(oldName)) return prev;
                                const tags = prev.tags?.flatMap(name => name === oldName ? newName ? [newName] : [] : [name]);
                                return { ...prev, tags: tags?.length ? tags : undefined, page: 1 };
                            },
                        });
                    }}
                    onFilterApply={advancedFilters => void navigate({
                        resetScroll: false,
                        search: prev => ({ ...prev, ...advancedFilters, filtersTab: undefined, page: 1 }),
                    })}
                />
            </div>
        </PageTitle>
    );
}
