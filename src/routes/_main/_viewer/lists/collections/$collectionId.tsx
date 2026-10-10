import type {ScopedMediaFilterValues} from "@/lib/schemas/media-filters.schema";
import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {MediaType, Status} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {collectionBrowseSearchSchema, collectionIdSchema} from "@/lib/schemas";
import {useQuery, useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {ArrowLeft, Copy, Eye, Heart, Layers3, List, ListOrdered, Pin} from "lucide-react";
import {MediaListResults} from "@/lib/client/components/media/base/MediaListResults";
import {CollectionActions} from "@/lib/client/components/collections/CollectionActions";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {CollectionMediaTypes} from "@/lib/client/components/collections/CollectionMediaTypes";
import {MediaBrowseFiltersSheet} from "@/lib/client/components/media/browse/MediaBrowseFiltersSheet";
import {collectionDetailsReadOptions, collectionDetailsReadQueryKey} from "@/lib/client/react-query/query-options";
import {createMediaBrowseStatusOptions, MEDIA_BROWSE_LIBRARY_OPTIONS} from "@/lib/client/components/media/browse/media-browse.config";
import {useCopyCollectionMutation, useToggleCollectionLikeMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {BrowseAppliedFilters, type MediaBrowseFilterKey, type MediaBrowseFilterScope} from "@/lib/client/components/media/browse/AppliedFilters";


export const Route = createFileRoute("/_main/_viewer/lists/collections/$collectionId")({
    validateSearch: collectionBrowseSearchSchema,
    loaderDeps: ({ search: { display: _display, fromCommunity: _fromCommunity, ...filters } }) => ({ filters }),
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            return result.success ? result.data : false;
        }
    },
    context: ({ params: { collectionId }, deps: { filters } }) => ({
        collectionDetailsQueryOptions: collectionDetailsReadOptions(collectionId, filters),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.collectionDetailsQueryOptions);
    },
    component: CollectionViewer,
});


function CollectionViewer() {
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const { collectionId } = Route.useParams();
    const { isAnonymous, currentUser } = useAuth();
    const { fromCommunity, ...filters } = Route.useSearch();
    const copyMutation = useCopyCollectionMutation(collectionId);

    const [filtersOpen, setFiltersOpen] = useState(false);
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const toggleLikeMutation = useToggleCollectionLikeMutation(collectionId);
    const searchInput = useSearchNavigate<typeof filters>({ search: filters.search ?? "" });

    const filterOptionsQuery = useQuery({
        ...collectionDetailsReadOptions(collectionId, filters, true),
        enabled: filtersOpen,
    });

    const { collection, items, isLiked, capabilities } = apiData;
    const CollectionTypeIcon = collection.ordered ? ListOrdered : List;

    const isGrid = filters.display !== "table";
    const hasActions = capabilities.like || capabilities.copy;

    const availableMediaTypes = apiData.filterOptions.mediaTypes;
    const selectedMediaTypes = filters.mediaType ? [filters.mediaType] : availableMediaTypes;

    const showTrackingControls = !isAnonymous && filters.library === "in";
    const mediaTypeItems = createMediaSelectItems(availableMediaTypes, { leading: "all", leadingLabel: "All types" });

    const statusOptions = createMediaBrowseStatusOptions(selectedMediaTypes);
    const sortingOptions = getMediaSortOptions(selectedMediaTypes, showTrackingControls);

    const handleFilterChange = (patch: Partial<typeof filters>) => {
        searchInput.updateFilters({ ...patch, page: 1 });
    };

    const handleRemoveFilter = (key: MediaBrowseFilterKey, value?: string, scope?: MediaBrowseFilterScope) => {
        if (key === "search") searchInput.setLocalSearch("");

        if (scope) {
            const metadata: ScopedMediaFilterValues | undefined = filters.mediaFilters?.[scope.mediaType];
            const selected = metadata?.[scope.field]?.filter(item => item !== value);
            handleFilterChange({
                mediaFilters: {
                    ...filters.mediaFilters,
                    [scope.mediaType]: { ...metadata, [scope.field]: selected?.length ? selected : undefined },
                },
            });
            return;
        }

        if ((key === "genres" || key === "tags") && value) {
            const selected = filters[key]?.filter(item => item !== value);
            handleFilterChange({ [key]: selected?.length ? selected : undefined });
            return;
        }

        if (key === "library") {
            handleLibraryChange("all");
            return;
        }

        handleFilterChange({ [key]: undefined, ...(key === "mediaType" && { sorting: undefined }) });
    };

    const handleLibraryChange = (library: string) => {
        const availableSorting = getMediaSortOptions(selectedMediaTypes, !isAnonymous && library === "in");

        handleFilterChange({
            tags: undefined,
            status: undefined,
            comment: undefined,
            favorite: undefined,
            minRating: undefined,
            mediaFilters: undefined,
            library: library === "all" ? undefined : library as typeof filters.library,
            sorting: filters.sorting === "default" || availableSorting.some(option => option.value === filters.sorting)
                ? filters.sorting
                : undefined,
        });
    };

    const handleResetFilters = () => {
        searchInput.setLocalSearch("");

        handleFilterChange({
            tags: undefined,
            genres: undefined,
            status: undefined,
            search: undefined,
            library: undefined,
            sorting: undefined,
            comment: undefined,
            favorite: undefined,
            mediaType: undefined,
            minRating: undefined,
            mediaFilters: undefined,
        });
    };

    const handleEdited = async () => {
        await queryClient.invalidateQueries({ queryKey: collectionDetailsReadQueryKey(collectionId) });
    };

    const handleLikeCollection = () => {
        toggleLikeMutation.mutate({ data: { collectionId } });
    };

    const handleCopyCollection = async () => {
        const result = await copyMutation.mutateAsync({ data: { collectionId } });
        await navigate({ to: "/lists/collections/$collectionId/edit", params: { collectionId: result.id } });
    };

    const onChangePage = (nextPage: number) => {
        void navigate({ search: prev => ({ ...prev, page: nextPage }) });
    };

    return (
        <PageTitle title={collection.title} onlyHelmet>
            <div className="mb-8 flex min-w-0 flex-col pt-8">
                <PageHeader
                    asideIcon={Layers3}
                    title={<span className="flex items-center gap-2 [overflow-wrap:anywhere]">
                        {collection.profilePosition !== null && <Pin className="size-5 shrink-0 fill-brand/20 text-brand" aria-hidden="true"/>}
                        {collection.title}
                    </span>}
                    asideLabel="In this collection"
                    asideValue={<>{formatNumber(collection.itemsCount)} media</>}
                    eyebrow={fromCommunity ?
                        <Link
                            search={fromCommunity}
                            to="/collections/discover"
                            className="inline-flex items-center gap-2 rounded-sm text-brand outline-none transition-colors
                            hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                            focus-visible:ring-offset-background"
                        >
                            <ArrowLeft className="size-4"/> Community collections
                        </Link>
                        :
                        <ListsBackLink
                            username={collection.ownerName}
                        />
                    }
                    description={
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                            Made by
                            <Link
                                to="/profile/$username"
                                params={{ username: collection.ownerName }}
                                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-brand"
                            >
                                {collection.ownerName}
                            </Link>
                        </span>
                    }
                />

                <div className="flex flex-col gap-4 pb-5 pt-4">
                    <MediaBrowseToolbar
                        isGrid={isGrid}
                        search={searchInput.localSearch}
                        searchLabel="Search this collection"
                        searchPlaceholder="Search this collection..."
                        onSearchChange={searchInput.handleInputChange}
                        onFiltersClick={() => setFiltersOpen(true)}
                        onGridClick={() => navigate({ replace: true, search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }) })}
                        trailing={
                            <QuickActions mediaType={filters.mediaType} username={collection.ownerName}>
                                {(currentUser?.id === collection.ownerId || capabilities.edit || capabilities.delete) &&
                                    <CollectionActions
                                        collection={collection}
                                        capabilities={capabilities}
                                        fromCommunity={fromCommunity}
                                        onDeleted={() => {
                                            if (fromCommunity) {
                                                void navigate({ to: "/collections/discover", search: fromCommunity });
                                            }
                                            else {
                                                void navigate({ to: "/lists/$username", params: { username: collection.ownerName } });
                                            }
                                        }}
                                    />
                                }
                            </QuickActions>
                        }
                        selects={[
                            ...(availableMediaTypes.length > 1 ? [{
                                key: "mediaType",
                                items: mediaTypeItems,
                                label: "Filter by media type",
                                value: filters.mediaType ?? "all",
                                onChange: (mediaType: string) => handleFilterChange({
                                    sorting: undefined,
                                    mediaType: mediaType === "all" ? undefined : mediaType as MediaType,
                                }),
                            }] : []),
                            ...(!isAnonymous ? [
                                {
                                    key: "library",
                                    label: "Filter by library",
                                    onChange: handleLibraryChange,
                                    value: filters.library ?? "all",
                                    items: MEDIA_BROWSE_LIBRARY_OPTIONS,
                                },
                            ] : []),
                            ...(showTrackingControls ? [{
                                key: "status",
                                items: statusOptions,
                                label: "Filter by status",
                                value: filters.status ?? "all",
                                onChange: (status: string) => handleFilterChange({
                                    status: status === "all" ? undefined : status as Status,
                                }),
                            }] : []),
                            {
                                key: "sorting",
                                label: "Sort collection titles",
                                value: filters.sorting ?? "default",
                                items: [{ value: "default", label: "Collection order" }, ...sortingOptions],
                                onChange: (sorting: string) => handleFilterChange({
                                    sorting: sorting as typeof filters.sorting,
                                }),
                            },
                        ]}
                    />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <CollectionMediaTypes
                                mediaTypes={collection.mediaTypes}
                            />
                            <Badge variant="outline">
                                {collection.ordered
                                    ? <><ListOrdered className="size-3"/> Ranked</>
                                    : <><List className="size-3"/> Unranked</>
                                }
                            </Badge>
                            <Badge variant="outline">
                                <PrivacyIcon
                                    className="size-4"
                                    type={collection.privacy}
                                />
                                {collection.privacy}
                            </Badge>

                            <span className="h-4 border-l max-sm:hidden" aria-hidden="true"/>

                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Likes">
                                <Heart className="size-3.5 text-brand" aria-hidden="true"/>
                                <span className="tabular-nums">{formatNumber(collection.likeCount)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Views">
                                <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                                <span className="tabular-nums">{formatNumber(collection.viewCount)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Copies">
                                <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                                <span className="tabular-nums">{formatNumber(collection.copiedCount)}</span>
                            </span>
                        </div>

                        {hasActions &&
                            <div className="flex h-6 items-center gap-3 border-l pl-4">
                                {capabilities.like &&
                                    <Button variant="ghost" size="bare" className="gap-1.5 text-xs text-muted-foreground" onClick={handleLikeCollection}
                                            disabled={toggleLikeMutation.isPending}>
                                        <Heart className={`size-3.5 ${isLiked ? "fill-favorite text-favorite" : "text-brand"}`}/>
                                        {isLiked ? "Liked" : "Like"}
                                    </Button>
                                }

                                {capabilities.copy &&
                                    <Button variant="ghost" size="bare" className="gap-1.5 text-xs text-muted-foreground" onClick={handleCopyCollection}
                                            disabled={copyMutation.isPending}>
                                        <Copy className="size-3.5 text-brand"/> Copy
                                    </Button>
                                }

                            </div>
                        }
                    </div>

                    {collection.description &&
                        <p className="w-full whitespace-pre-line rounded-r-lg border-l-2 border-brand/30 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                            {collection.description}
                        </p>
                    }

                    <BrowseAppliedFilters
                        filters={filters}
                        total={apiData.total}
                        totalPages={apiData.pages}
                        onReset={handleResetFilters}
                        onRemove={handleRemoveFilter}
                    />
                </div>

                {items.length === 0 ?
                    <EmptyState
                        icon={CollectionTypeIcon}
                        className="rounded-xl border py-20 shadow-xs"
                        message={collection.itemsCount === 0
                            ? "This collection does not have any media yet."
                            : "No titles match these filters."
                        }
                    />
                    :
                    <MediaListResults
                        onEdited={handleEdited}
                        isCurrent={!isAnonymous}
                        isConnected={!isAnonymous}
                        display={isGrid ? "grid" : "table"}
                        username={currentUser?.name ?? collection.ownerName}
                        activeMediaTypes={getActiveMediaTypes(currentUser?.settings)}
                        items={items.map(item => ({
                            ...item,
                            imageCover: item.mediaCover,
                            rank: collection.ordered ? item.orderIndex : undefined,
                        }))}
                    />
                }

                <Pagination
                    currentPage={apiData.page}
                    totalPages={apiData.pages}
                    onChangePage={onChangePage}
                />

                {filtersOpen &&
                    <MediaBrowseFiltersSheet
                        personal={!isAnonymous}
                        personalLabel="Your tracking"
                        filters={filters}
                        open={filtersOpen}
                        onApply={handleFilterChange}
                        onOpenChange={setFiltersOpen}
                        error={filterOptionsQuery.error}
                        isPending={filterOptionsQuery.isPending}
                        onRetry={() => void filterOptionsQuery.refetch()}
                        options={filterOptionsQuery.data?.filterOptions ?? apiData.filterOptions}
                    />
                }
            </div>
        </PageTitle>
    );
}
