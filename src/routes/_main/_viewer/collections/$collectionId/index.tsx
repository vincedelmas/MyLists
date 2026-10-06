import {collectionIdSchema} from "@/lib/schemas";
import {THEME_ICONS_MAP} from "@/lib/client/theme";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {Copy, Eye, Heart, Layers3, List, ListOrdered, Pencil} from "lucide-react";
import {collectionDetailsReadOptions} from "@/lib/client/react-query/query-options";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {MediaBrowseResults} from "@/lib/client/components/media/browse/MediaBrowseResults";
import {MEDIA_BROWSE_LIBRARY_OPTIONS} from "@/lib/client/components/media/browse/media-browse.config";
import {mediaCatalogBrowseSearchSchema, type MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {BrowseAppliedFilters, type MediaBrowseFilterKey} from "@/lib/client/components/media/browse/AppliedFilters";
import {useCopyCollectionMutation, useToggleCollectionLikeMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_viewer/collections/$collectionId/")({
    validateSearch: mediaCatalogBrowseSearchSchema,
    loaderDeps: ({ search: { display: _display, ...filters } }) => ({ filters }),
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
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const copyMutation = useCopyCollectionMutation(collectionId);
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const toggleLikeMutation = useToggleCollectionLikeMutation(collectionId);
    const searchInput = useSearchNavigate<MediaBrowseFilters>({ search: filters.search ?? "" });

    const { collection, items, isLiked, capabilities } = apiData;
    const CollectionTypeIcon = collection.ordered ? ListOrdered : List;
    const hasActions = capabilities.like || capabilities.copy || capabilities.edit;

    const isGrid = filters.display !== "table";
    const MediaIcon = THEME_ICONS_MAP[collection.mediaType];
    const sortingOptions = getMediaSortOptions([collection.mediaType], false);

    const handleFilterChange = (patch: Partial<MediaBrowseFilters>) => {
        searchInput.updateFilters({ ...patch, page: 1 });
    };

    const handleRemoveFilter = (key: MediaBrowseFilterKey) => {
        if (key === "search") searchInput.setLocalSearch("");
        handleFilterChange({ [key]: undefined });
    };

    const handleResetFilters = () => {
        searchInput.setLocalSearch("");
        handleFilterChange({
            search: undefined,
            library: undefined,
            sorting: undefined,
        });
    };

    const handleLikeCollection = () => {
        toggleLikeMutation.mutate({ data: { collectionId } });
    };

    const handleCopyCollection = async () => {
        const result = await copyMutation.mutateAsync({ data: { collectionId } });
        await navigate({ to: "/collections/$collectionId/edit", params: { collectionId: result.id } });
    };

    const handleEditCollection = async () => {
        await navigate({ to: "/collections/$collectionId/edit", params: { collectionId } });
    };

    const onChangePage = (nextPage: number) => {
        void navigate({ search: prev => ({ ...prev, page: nextPage }) });
    };

    return (
        <PageTitle title={collection.title} onlyHelmet>
            <div className="mb-8 flex min-w-0 flex-col pt-8">
                <PageHeader
                    asideIcon={Layers3}
                    eyebrowIcon={MediaIcon}
                    title={collection.title}
                    asideLabel="In this collection"
                    eyebrow={`${capitalize(collection.mediaType)} collection`}
                    asideValue={<>{formatNumber(collection.itemsCount)} {collection.itemsCount === 1 ? "title" : "titles"}</>}
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

                            {capabilities.edit &&
                                <Button variant="outline" onClick={handleEditCollection}>
                                    <Pencil/> Edit
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
                        isGrid={isGrid}
                        search={searchInput.localSearch}
                        searchLabel="Search this collection"
                        searchPlaceholder="Search this collection..."
                        onSearchChange={searchInput.handleInputChange}
                        onGridClick={() => void navigate({
                            replace: true,
                            search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }),
                        })}
                        selects={[
                            ...(!isAnonymous ? [
                                {
                                    key: "library",
                                    label: "Filter by library",
                                    value: filters.library ?? "all",
                                    items: MEDIA_BROWSE_LIBRARY_OPTIONS,
                                    onChange: (library: string) => handleFilterChange({
                                        library: library === "all" ? undefined : library as MediaBrowseFilters["library"],
                                    }),
                                },
                            ] : []),
                            {
                                key: "sorting",
                                label: "Sort collection titles",
                                value: filters.sorting ?? "default",
                                items: [{ value: "default", label: "Collection order" }, ...sortingOptions],
                                onChange: (sorting: string) => handleFilterChange({
                                    sorting: sorting as MediaBrowseFilters["sorting"],
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
                        message={collection.itemsCount === 0 ? "This collection does not have any media yet." : "No titles match these filters."}
                    />
                    :
                    <MediaBrowseResults
                        personal={!isAnonymous}
                        display={isGrid ? "grid" : "table"}
                        items={items.map(item => ({
                            ...item,
                            title: item.mediaName,
                            imageCover: item.mediaCover,
                            mediaType: collection.mediaType,
                            rank: collection.ordered ? item.orderIndex : undefined,
                        }))}
                    />
                }

                <Pagination
                    currentPage={apiData.page}
                    totalPages={apiData.pages}
                    onChangePage={onChangePage}
                />
            </div>
        </PageTitle>
    );
}
