import z from "zod";
import {useState} from "react";
import {Status} from "@/lib/utils/enums";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {createFileRoute, Link} from "@tanstack/react-router";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {formatNumber} from "@/lib/utils/formatting/number";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {smartViewSearchSchema} from "@/lib/schemas/smart-views.schema";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {SmartViewBadges} from "@/lib/client/components/smart-views/SmartViewBadges";
import {ArrowLeft, Layers3, PencilLine, Trash2} from "lucide-react";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {SmartListResults} from "@/lib/client/components/smart-views/SmartListResults";
import {SmartListPinButton} from "@/lib/client/components/smart-views/SmartListPinButton";
import {MediaBrowseFiltersSheet} from "@/lib/client/components/media/browse/MediaBrowseFiltersSheet";
import {createMediaBrowseStatusOptions} from "@/lib/client/components/media/browse/media-browse.config";
import {smartViewOptions} from "@/lib/client/react-query/query-options/smart-views.options";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {BrowseAppliedFilters, type MediaBrowseFilterKey} from "@/lib/client/components/media/browse/AppliedFilters";
import {useDeleteSmartViewMutation} from "@/lib/client/react-query/query-mutations/smart-views.mutations";
import {cn} from "@/lib/utils/classnames";


export const Route = createFileRoute("/_main/_viewer/smart-views/$viewId")({
    params: {
        parse: params => {
            const result = z.strictObject({ viewId: z.coerce.number().int().positive() }).safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: smartViewSearchSchema,
    loaderDeps: ({ search: { page, view: _display, ...filters } }) => ({ page, filters }),
    loader: ({ params: { viewId }, deps: { page, filters }, context: { queryClient } }) => {
        return queryClient.fetchQuery(smartViewOptions(viewId, page, filters));
    },
    component: SmartViewPage,
});


function SmartViewPage() {
    const confirm = useConfirm();
    const navigate = Route.useNavigate();
    const { viewId } = Route.useParams();
    const deleteMutation = useDeleteSmartViewMutation();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const { page, view: displayOverride, ...filters } = Route.useSearch();
    const { view, results, isOwner, owner } = useSuspenseQuery(smartViewOptions(viewId, page, filters)).data;
    const { localSearch, handleInputChange, setLocalSearch } = useSearchNavigate({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const isGrid = displayOverride ? displayOverride === "grid" : view.spec.display === "grid";
    const mediaTypes = results.mediaTypes;
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

    const handleFiltersChange = (next: Partial<MediaBrowseFilters>) => {
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

    const handleFilterRemove = (key: MediaBrowseFilterKey, value?: string) => {
        if (key === "search") setLocalSearch("");
        handleFiltersChange({
            [key]: key === "genres" || key === "tags" ? filters[key]?.filter(item => item !== value) : undefined,
        });
    };

    const handleDelete = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Delete list",
            title: "Delete this smart list?",
            description: "This smart list will be deleted. The titles in your tracking lists stay as they are.",
        })) return;

        deleteMutation.mutate(viewId, { onSuccess: () => navigate({ to: "/smart-views" }) });
    };

    const handleDisplayToggle = () => {
        void navigate({ search: previous => ({ ...previous, view: isGrid ? "table" : "grid" }), replace: true });
    };

    const handlePageChange = (page: number) => {
        void navigate({ search: previous => ({ ...previous, page }) });
    };

    return (
        <PageTitle title={view.spec.title} onlyHelmet>
            <div className="flex min-w-0 flex-col gap-6 pt-5 pb-12 sm:pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {isOwner ?
                        <Link to="/smart-views" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                            <ArrowLeft data-icon="inline-start"/> All smart lists
                        </Link>
                        :
                        <Link to="/profile/$username" params={{ username: owner.username }} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                            <ArrowLeft data-icon="inline-start"/> {owner.username}'s profile
                        </Link>
                    }
                    {isOwner &&
                        <div className="flex items-center gap-2">
                            <SmartListPinButton view={view} compact/>
                            <Link to="/smart-views/$viewId/edit" params={{ viewId }} search={{ page, view: displayOverride, ...filters }} aria-label="Edit smart list" className={buttonVariants({ variant: "outline", size: "sm" })}>
                                <PencilLine data-icon="inline-start"/> Edit
                            </Link>
                            <Button
                                size="icon-sm"
                                onClick={handleDelete}
                                variant="destructiveGhost"
                                aria-label="Delete smart list"
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending
                                    ? <Spinner/>
                                    : <Trash2/>
                                }
                            </Button>
                        </div>
                    }
                </div>
                <PageHeader
                    eyebrowIcon={Layers3}
                    asideIcon={Layers3}
                    eyebrow={isOwner ? "Your smart list" : `${owner.username}'s smart list`}
                    title={<span className="[overflow-wrap:anywhere]">{view.spec.title}</span>}
                    asideValue={<>{formatNumber(results.total)} media</>}
                />

                <SmartViewBadges
                    spec={view.spec}
                    sortLabel={sortLabel}
                />

                <section className="flex min-w-0 flex-col gap-3" aria-label="Browse this smart list">
                    <MediaBrowseToolbar
                        isGrid={isGrid}
                        search={localSearch}
                        onGridClick={handleDisplayToggle}
                        onSearchChange={handleInputChange}
                        searchLabel="Search this smart list"
                        onFiltersClick={() => setFiltersOpen(true)}
                        searchPlaceholder="Search within this list..."
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

                    <BrowseAppliedFilters
                        filters={filters}
                        total={results.total}
                        totalPages={results.pages}
                        onReset={handleFiltersReset}
                        onRemove={handleFilterRemove}
                    />
                </section>
                {results.items.length > 0 ?
                    <SmartListResults
                        isOwner={isOwner}
                        username={owner.username}
                        items={results.items}
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
                                    <Link to="/smart-views/$viewId/edit" params={{ viewId }} search={{ page, view: displayOverride, ...filters }} className={buttonVariants({ variant: "outline" })}>
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
                    onOpenChange={setFiltersOpen}
                    onApply={handleFiltersChange}
                    options={results.filterOptions}
                />
            }

        </PageTitle>
    );
}
