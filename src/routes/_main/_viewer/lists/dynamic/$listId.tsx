import z from "zod";
import {useState} from "react";
import {Status} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Layers3, PencilLine, Pin} from "lucide-react";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {BrowseAppliedFilters} from "@/lib/client/components/media/browse/AppliedFilters";
import {DynamicListBadges} from "@/lib/client/components/dynamic-lists/DynamicListBadges";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {DynamicListResults} from "@/lib/client/components/dynamic-lists/DynamicListResults";
import {DynamicListActions} from "@/lib/client/components/dynamic-lists/DynamicListActions";
import {dynamicListOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";
import {MediaBrowseFiltersSheet} from "@/lib/client/components/media/browse/MediaBrowseFiltersSheet";
import {createMediaBrowseStatusOptions} from "@/lib/client/components/media/browse/media-browse.config";
import {dynamicListSearchSchema, type DynamicListRuntimeFilters} from "@/lib/schemas/dynamic-lists.schema";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {removeMediaBrowseFilter, type MediaBrowseFilterKey, type MediaBrowseFilterScope} from "@/lib/client/components/media/browse/media-filter.utils";


export const Route = createFileRoute("/_main/_viewer/lists/dynamic/$listId")({
    params: {
        parse: params => {
            const result = z.strictObject({ listId: z.coerce.number().int().positive() }).safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: dynamicListSearchSchema,
    loaderDeps: ({ search: { page, view: _display, ...filters } }) => ({ page, filters }),
    loader: ({ params: { listId }, deps: { page, filters }, context: { queryClient } }) => {
        return queryClient.query({ ...dynamicListOptions(listId, page, filters), staleTime: "static" });
    },
    component: DynamicListPage,
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `${loaderData.view.spec.title} - MyLists` }] : [],
    }),
});


function DynamicListPage() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { listId } = Route.useParams();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const { page, view: displayOverride, ...filters } = Route.useSearch();
    const { view, results, isOwner, owner, activeMediaTypes } = useSuspenseQuery(dynamicListOptions(listId, page, filters)).data;
    const filterOptionsQuery = useQuery({ ...dynamicListOptions(listId, page, filters, true), enabled: filtersOpen });
    const { localSearch, handleInputChange, setLocalSearch } = useSearchNavigate({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const mediaTypes = results.mediaTypes;
    const isGrid = displayOverride ? displayOverride === "grid" : view.spec.display === "grid";
    const declaredMediaTypes = view.spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : view.spec.mediaTypes;

    const sortScope = mediaTypes.length ? mediaTypes : declaredMediaTypes;
    const sortMediaTypes = filters.mediaType && declaredMediaTypes.includes(filters.mediaType) ? [filters.mediaType] : sortScope;

    const sortingOptions = [
        { value: "default", label: "Saved order" },
        ...getMediaSortOptions(sortMediaTypes, true),
    ];

    const sortLabel = results.sorting !== "default"
        ? sortingOptions.find(option => option.value === results.sorting)!.label
        : undefined;

    const handleFiltersChange = (next: Partial<DynamicListRuntimeFilters>) => {
        if ("mediaType" in next && filters.sorting && filters.sorting !== "default"
            && !getMediaSortOptions(next.mediaType && mediaTypes.includes(next.mediaType) ? [next.mediaType] : sortScope, true)
                .some(option => option.value === filters.sorting)) {
            next.sorting = undefined;
        }

        void navigate({ search: previous => ({ ...previous, ...next, page: 1 }), resetScroll: false });
    };

    const handleFiltersReset = () => {
        setLocalSearch("");
        void navigate({ search: { page: 1, view: displayOverride }, resetScroll: false });
    };

    const handleFilterRemove = (key: MediaBrowseFilterKey, value?: string, scope?: MediaBrowseFilterScope) => {
        if (key === "search") setLocalSearch("");

        handleFiltersChange(removeMediaBrowseFilter(filters, key, value, scope));
    };

    const handleDisplayToggle = () => {
        void navigate({ search: prev => ({ ...prev, view: isGrid ? "table" : "grid" }), replace: true });
    };

    const handlePageChange = (page: number) => {
        void navigate({ search: prev => ({ ...prev, page }) });
    };

    return (
        <>
            <div className="flex min-w-0 flex-col gap-6 pt-8 pb-12">
                <PageHeader
                    asideIcon={Layers3}
                    asideLabel="Dynamic list"
                    description="Media you track that match these rules. Results update as your tracking changes."
                    eyebrow={<ListsBackLink username={owner.username}/>}
                    asideValue={<>{formatNumber(results.total)} media</>}
                    title={
                        <span className="flex items-center gap-2 [overflow-wrap:anywhere]">
                            {view.profilePosition !== null && <Pin className="size-5 shrink-0 fill-brand/20 text-brand" aria-hidden="true"/>}
                            {view.spec.title}
                        </span>
                    }
                />

                <section className="flex min-w-0 flex-col gap-4 -mt-2" aria-label="Browse this dynamic list">
                    <MediaBrowseToolbar
                        isGrid={isGrid}
                        search={localSearch}
                        onGridClick={handleDisplayToggle}
                        onSearchChange={handleInputChange}
                        searchLabel="Search this dynamic list"
                        onFiltersClick={() => setFiltersOpen(true)}
                        searchPlaceholder="Search within this list..."
                        trailing={
                            <QuickActions username={owner.username} mediaType={filters.mediaType}>
                                {isOwner &&
                                    <DynamicListActions
                                        view={view}
                                        search={{ page, view: displayOverride, ...filters }}
                                        onDeleted={() => void navigate({ to: "/lists/$username", params: { username: owner.username } })}
                                    />
                                }
                            </QuickActions>
                        }
                        selects={[
                            ...(mediaTypes.length > 1 ? [{
                                key: "mediaType",
                                label: "Filter by media type",
                                value: filters.mediaType ?? "all",
                                items: createMediaSelectItems(mediaTypes, { leading: "all", leadingLabel: "All types" }),
                                onChange: (value: string) => handleFiltersChange({
                                    mediaType: value === "all" ? undefined : value as MediaBrowseFilters["mediaType"],
                                }),
                            }] : []),
                            {
                                key: "status",
                                label: "Filter by status",
                                value: filters.status ?? "all",
                                items: createMediaBrowseStatusOptions(sortScope),
                                onChange: value => handleFiltersChange({ status: value === "all" ? undefined : value as Status }),
                            },
                            {
                                key: "sorting",
                                label: "Sort media",
                                items: sortingOptions,
                                value: results.sorting,
                                onChange: value => handleFiltersChange({ sorting: value as MediaBrowseFilters["sorting"] }),
                            },
                        ]}
                    />

                    <DynamicListBadges
                        spec={view.spec}
                        tagNames={view.tagNames}
                        sortLabel={sortLabel}
                        activeMediaTypes={activeMediaTypes}
                    />

                    <BrowseAppliedFilters
                        total={results.total}
                        totalPages={results.pages}
                        onReset={handleFiltersReset}
                        onRemove={handleFilterRemove}
                        filters={{ ...filters, page }}
                        additionalGroups={filters.hideCommon
                            ? [{
                                key: "hideCommon",
                                label: "Comparison",
                                items: [{
                                    key: "hideCommon",
                                    label: "Hide Common",
                                    removeLabel: "Remove Hide Common",
                                    onRemove: () => handleFiltersChange({ hideCommon: undefined }),
                                }],
                            }]
                            : []
                        }
                    />
                </section>

                {results.items.length > 0 ?
                    <DynamicListResults
                        isOwner={isOwner}
                        items={results.items}
                        username={owner.username}
                        display={isGrid ? "grid" : "table"}
                    />
                    :
                    <Empty className="border py-16">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Layers3/>
                            </EmptyMedia>
                            <EmptyTitle>
                                {results.total > 0
                                    ? "There are no titles on this page"
                                    : "Nothing matches just yet"
                                }
                            </EmptyTitle>
                            <EmptyDescription>
                                {results.total > 0
                                    ? "Go back to the first page to see the current matches."
                                    : "Titles appear automatically when they match this list's rules."
                                }
                            </EmptyDescription>
                        </EmptyHeader>

                        {(results.total > 0 || isOwner) &&
                            <EmptyContent>
                                {results.total > 0 ?
                                    <Button variant="outline" onClick={() => handlePageChange(1)}>
                                        Go to first page
                                    </Button>
                                    :
                                    <Link
                                        params={{ listId }}
                                        to="/lists/dynamic/$listId/edit"
                                        className={buttonVariants({ variant: "outline" })}
                                        search={{ page, view: displayOverride, ...filters }}
                                    >
                                        <PencilLine data-icon="inline-start"/> Adjust rules
                                    </Link>
                                }
                            </EmptyContent>
                        }
                    </Empty>
                }
                <Pagination
                    currentPage={results.page}
                    totalPages={results.pages}
                    onChangePage={handlePageChange}
                />
            </div>

            {filtersOpen &&
                <MediaBrowseFiltersSheet
                    open={true}
                    personal={true}
                    filters={filters}
                    onApply={handleFiltersChange}
                    onOpenChange={setFiltersOpen}
                    error={filterOptionsQuery.error}
                    isPending={filterOptionsQuery.isPending}
                    allowHideCommon={!isOwner && !!currentUser}
                    onRetry={() => void filterOptionsQuery.refetch()}
                    searchSource={{ type: "tracking", username: owner.username }}
                    options={{ ...(filterOptionsQuery.data?.results.filterOptions ?? results.filterOptions), mediaTypes: results.mediaTypes }}
                />
            }
        </>
    );
}
