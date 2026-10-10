import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {MediaType, Status} from "@/lib/utils/enums";
import type {MediaMetadataFilters} from "@/lib/media-definitions/definition.registry";
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
import {CollectionActions} from "@/lib/client/components/collections/CollectionActions";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {collectionBrowseSearchSchema, collectionIdSchema} from "@/lib/schemas";
import {useQuery, useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {ArrowLeft, Copy, Eye, Heart, Layers3, List, ListOrdered} from "lucide-react";
import {MediaListResults} from "@/lib/client/components/media/base/MediaListResults";
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
    const { fromCommunity, ...filters } = Route.useSearch();
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const { collectionId } = Route.useParams();
    const { isAnonymous, currentUser } = useAuth();
    const [filtersOpen, setFiltersOpen] = useState(false);

    const copyMutation = useCopyCollectionMutation(collectionId);
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
    const hasActions = capabilities.like || capabilities.copy;

    const isGrid = filters.display !== "table";
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
            const metadata: MediaMetadataFilters | undefined = filters.mediaFilters?.[scope.mediaType];
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
                    eyebrow={fromCommunity ?
                        <Link
                            to="/collections/discover"
                            search={fromCommunity}
                            className="inline-flex items-center gap-2 rounded-sm text-brand outline-none transition-colors hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true"/> Community collections
                        </Link>
                        : <ListsBackLink username={collection.ownerName}/>
                    }
                    title={collection.title}
                    asideLabel="In this collection"
                    asideValue={<>{formatNumber(collection.itemsCount)} media</>}
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

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 max-sm:flex-col max-sm:items-stretch">
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
                            <span className="tabular-nums">
                                {formatNumber(collection.likeCount)}
                            </span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Views">
                            <Eye className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">
                                {formatNumber(collection.viewCount)}
                            </span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Copies">
                            <Copy className="size-3.5 text-brand" aria-hidden="true"/>
                            <span className="tabular-nums">
                                {formatNumber(collection.copiedCount)}
                            </span>
                        </span>
                    </div>

                    {hasActions &&
                        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>button]:flex-1">
                            {capabilities.like &&
                                <Button variant="outline" onClick={handleLikeCollection} disabled={toggleLikeMutation.isPending}>
                                    <Heart className={isLiked ? "fill-favorite text-favorite" : ""}/>
                                    {isLiked ? "Liked" : "Like"}
                                </Button>
                            }

                            {capabilities.copy &&
                                <Button variant="outline" onClick={handleCopyCollection} disabled={copyMutation.isPending}>
                                    <Copy/> Copy
                                </Button>
                            }

                        </div>
                    }
                </div>

                {collection.description &&
                    <p className="max-w-3xl whitespace-pre-line pt-5 text-sm leading-relaxed text-muted-foreground">
                        {collection.description}
                    </p>
                }

                <div className="flex flex-col gap-4 pb-5 pt-4">
                    <MediaBrowseToolbar
                        trailing={
                            <QuickActions username={collection.ownerName} mediaType={filters.mediaType}>
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
                        isGrid={isGrid}
                        search={searchInput.localSearch}
                        searchLabel="Search this collection"
                        searchPlaceholder="Search this collection..."
                        onSearchChange={searchInput.handleInputChange}
                        onFiltersClick={showTrackingControls ? () => setFiltersOpen(true) : undefined}
                        onGridClick={() => void navigate({
                            replace: true,
                            search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }),
                        })}
                        selects={[
                            ...(availableMediaTypes.length > 1 ? [{
                                key: "mediaType",
                                items: mediaTypeItems,
                                label: "Filter by media type",
                                value: filters.mediaType ?? "all",
                                onChange: (mediaType: string) => handleFilterChange({
                                    mediaType: mediaType === "all" ? undefined : mediaType as MediaType,
                                    sorting: undefined,
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

                {filtersOpen && showTrackingControls &&
                    <MediaBrowseFiltersSheet
                        personal={true}
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
