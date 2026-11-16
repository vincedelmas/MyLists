import {useAuth} from "@/lib/client/hooks/use-auth";
import {LibraryBig, Play, Search} from "lucide-react";
import {hashKey, useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {ContinueGrid} from "@/lib/client/components/continue/ContinueGrid";
import {ContinueTable} from "@/lib/client/components/continue/ContinueTable";
import {useContinueOrder} from "@/lib/client/components/continue/continue-items";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {continueOptions} from "@/lib/client/react-query/query-options/continue.options";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {CONTINUE_SORT_KEYS, continueSearchSchema, type ContinueSearch} from "@/lib/schemas/continue.schema";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export const Route = createFileRoute("/_main/_viewer/lists/continue/$username")({
    validateSearch: continueSearchSchema,
    loaderDeps: ({ search: { display: _display, ...filters } }) => filters,
    loader: ({ params: { username }, deps, context: { queryClient } }) => {
        return queryClient.query({ ...continueOptions(username, deps), staleTime: Infinity });
    },
    component: ContinuePage,
    head: () => ({ meta: [{ title: "Continue - MyLists" }] }),
});


function ContinuePage() {
    const search = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const { display, ...filters } = search;
    const options = continueOptions(username, filters);
    const { data } = useSuspenseQuery(options);
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate(search);

    const items = useContinueOrder(data.items, hashKey(options.queryKey));
    const isGrid = display !== "table";
    const isOwner = currentUser?.name === username;

    const currentTab = data.mediaTypes.find(type => type === search.activeTab) ?? "all";
    const mediaItems = createMediaSelectItems(data.mediaTypes, { leading: "all", leadingLabel: "All types" });

    const progressItems = [
        { value: "all", label: "All Progress" },
        { value: "active", label: "Still in Progress" },
        { value: "ready", label: "Mark Complete" },
    ];

    const sortingOptions = CONTINUE_SORT_KEYS.map(key => ({
        value: key,
        label: MEDIA_SORT_DEFINITIONS[key].label,
    }));

    const hasFilters = Boolean(search.search || currentTab !== "all" || (search.progress && search.progress !== "all"));

    const handleFilterChange = (patch: Partial<ContinueSearch>) => {
        void updateFilters({ ...patch, page: 1 });
    };

    return (
        <div className="flex flex-col pt-4 pb-12 sm:pt-8">
            <PageHeader
                title="Continue"
                asideIcon={LibraryBig}
                asideLabel="In progress"
                eyebrow={<ListsBackLink username={username}/>}
                asideValue={`${data.pagination.totalItems} ${data.pagination.totalItems === 1 ? "title" : "titles"}`}
                description={isOwner
                    ? "Pick up where you left off. All your titles in progress, in one place."
                    : `What ${username} is currently watching, reading and playing.`
                }
            />

            <div className="flex flex-col gap-4 pt-4 sm:gap-6">
                <MediaBrowseToolbar
                    isGrid={isGrid}
                    search={localSearch}
                    onSearchChange={handleInputChange}
                    searchLabel="Search in progress titles"
                    onGridClick={() => void navigate({
                        replace: true,
                        resetScroll: false,
                        search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }),
                    })}
                    trailing={
                        <QuickActions
                            username={username}
                            mediaType={currentTab === "all" ? undefined : currentTab}
                        />
                    }
                    selects={[
                        {
                            key: "mediaType",
                            items: mediaItems,
                            value: currentTab,
                            label: "Filter by media type",
                            onChange: activeTab => handleFilterChange({ activeTab: activeTab as ContinueSearch["activeTab"] }),
                        },
                        {
                            key: "progress",
                            items: progressItems,
                            label: "Filter by progress",
                            value: search.progress ?? "all",
                            onChange: progress => handleFilterChange({ progress: progress as ContinueSearch["progress"] }),
                        },
                        {
                            key: "sorting",
                            label: "Sort titles",
                            items: sortingOptions,
                            value: search.sorting ?? "modified_newest",
                            onChange: sorting => handleFilterChange({ sorting: sorting as ContinueSearch["sorting"] }),
                        },
                    ]}
                />

                <Pagination
                    currentPage={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onChangePage={page => void navigate({ search: prev => ({ ...prev, page }) })}
                />

                {items.length > 0 ?
                    isGrid ?
                        <ContinueGrid
                            items={items}
                            readOnly={!isOwner}
                        />
                        :
                        <ContinueTable
                            items={items}
                            readOnly={!isOwner}
                        />
                    :
                    <Empty className="min-h-80 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Play/>
                            </EmptyMedia>
                            <EmptyTitle>
                                {data.mediaTypes.length === 0
                                    ? "Make room for your next story"
                                    : hasFilters
                                        ? "No matching titles"
                                        : "Nothing in progress here yet"
                                }
                            </EmptyTitle>
                            <EmptyDescription>
                                {data.mediaTypes.length === 0
                                    ? "Enable a series, anime, books, manga, or games list to start tracking your progress."
                                    : hasFilters
                                        ? "Try another search or progress filter."
                                        : "Set a title to In Progress in your lists and it will be waiting here."
                                }
                            </EmptyDescription>
                        </EmptyHeader>
                        {isOwner &&
                            <EmptyContent>
                                {data.mediaTypes.length === 0 ?
                                    <Link to="/settings/content-lists" className={buttonVariants()}>
                                        Manage my lists
                                    </Link>
                                    :
                                    <Link to="/search" className={buttonVariants()}>
                                        <Search data-icon="inline-start"/> Find something to start
                                    </Link>
                                }
                                {hasFilters &&
                                    <Link
                                        params={{ username }}
                                        to="/lists/continue/$username"
                                        search={{ display, sorting: search.sorting }}
                                        className={buttonVariants({ variant: "hover" })}
                                    >
                                        View all in progress
                                    </Link>
                                }
                            </EmptyContent>
                        }
                    </Empty>
                }
            </div>
        </div>
    );
}
