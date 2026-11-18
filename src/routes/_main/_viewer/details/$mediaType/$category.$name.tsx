import {getThemeIcon} from "@/lib/client/theme";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {mediaCategoryParamsSchema} from "@/lib/schemas";
import {formatNumber} from "@/lib/utils/formatting/number";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {capitalize, formatMediaCategoryName} from "@/lib/utils/formatting/text";
import {mediaCategoryDetailsOptions} from "@/lib/client/react-query/query-options";
import {BrowseAppliedFilters} from "@/lib/client/components/media/browse/AppliedFilters";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {MediaBrowseResults} from "@/lib/client/components/media/browse/MediaBrowseResults";
import type {MediaBrowseFilterKey} from "@/lib/client/components/media/browse/media-filter.utils";
import {MEDIA_BROWSE_LIBRARY_OPTIONS} from "@/lib/client/components/media/browse/media-browse.config";
import {mediaCatalogBrowseSearchSchema, type MediaCatalogBrowseFilters} from "@/lib/schemas/media-browse.schema";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$category/$name")({
    params: {
        parse: (params) => {
            const result = mediaCategoryParamsSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: mediaCatalogBrowseSearchSchema,
    loaderDeps: ({ search: { display: _display, ...filters } }) => ({ filters }),
    context: ({ params: { mediaType, category, name }, deps: { filters } }) => ({
        mediaCategoryDetailsQueryOptions: mediaCategoryDetailsOptions(mediaType, category, name, filters),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.mediaCategoryDetailsQueryOptions, staleTime: "static" });
    },
    head: ({ params: { name, mediaType, category } }) => ({
        meta: [{ title: `${formatMediaCategoryName(category, name)} · ${capitalize(mediaType)} - MyLists` }],
    }),
    component: MediaCategoryPage,
});


function MediaCategoryPage() {
    const filters = Route.useSearch();
    const { isAnonymous } = useAuth();
    const navigate = Route.useNavigate();
    const searchInput = useSearchNavigate(filters);
    const { mediaType, category, name } = Route.useParams();
    const { mediaCategoryDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(mediaCategoryDetailsQueryOptions).data;

    const MediaIcon = getThemeIcon(mediaType);
    const isGrid = filters.display !== "table";

    const title = formatMediaCategoryName(category, name);
    const sortingOptions = getMediaSortOptions([mediaType], false);
    const { label, icon: CategoryIcon, sectionTitle, descriptionVerb, descriptionSuffix } = getMediaConfig(mediaType).categories[category]!;

    const handleFilterChange = (patch: Partial<MediaCatalogBrowseFilters>) => {
        void searchInput.updateFilters({ ...patch, page: 1 });
    };

    const handleRemoveFilter = (key: MediaBrowseFilterKey) => {
        handleFilterChange({ [key]: undefined });
    };

    const handleResetFilters = () => {
        handleFilterChange({ search: undefined, library: undefined, sorting: undefined });
    };

    const onPageChange = async (newPage: number) => {
        await navigate({ search: prev => ({ ...prev, page: newPage }) });
    };

    return (
        <div className="mb-8 flex min-w-0 flex-col pt-8">
            <PageHeader
                title={title}
                asideIcon={MediaIcon}
                eyebrowIcon={CategoryIcon}
                eyebrow={`${label} · ${capitalize(mediaType)}`}
                asideLabel={`In this ${sectionTitle.toLowerCase()}`}
                description={`${capitalize(mediaType)} ${descriptionVerb} ${title}${descriptionSuffix}.`}
                asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "title" : "titles"}</>}
            />

            <div className="flex flex-col gap-4 pb-5 pt-4">
                <MediaBrowseToolbar
                    isGrid={isGrid}
                    search={searchInput.localSearch}
                    searchLabel={"Search these titles"}
                    searchPlaceholder="Search these titles..."
                    onSearchChange={searchInput.handleInputChange}
                    onGridClick={() => void navigate({ search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }), replace: true })}
                    selects={[
                        ...(!isAnonymous ? [
                            {
                                key: "list",
                                label: "Filter by list",
                                value: filters.library ?? "all",
                                items: MEDIA_BROWSE_LIBRARY_OPTIONS,
                                onChange: (library: string) => handleFilterChange({
                                    library: library === "all" ? undefined : library as MediaCatalogBrowseFilters["library"],
                                }),
                            },
                        ] : []),
                        {
                            key: "sorting",
                            items: sortingOptions,
                            label: "Sort these titles",
                            value: filters.sorting && filters.sorting !== "default" ? filters.sorting : "release_oldest",
                            onChange: (sorting: string) => handleFilterChange({ sorting: sorting as MediaCatalogBrowseFilters["sorting"] }),
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

            {apiData.items.length > 0 ?
                <MediaBrowseResults
                    showMembership={!isAnonymous}
                    display={isGrid ? "grid" : "table"}
                    items={apiData.items.map(item => ({ ...item, mediaType, title: item.mediaName }))}
                />
                :
                <EmptyState
                    icon={CategoryIcon}
                    className="rounded-xl border py-16"
                    message="No titles match these filters."
                />
            }

            <Pagination
                totalPages={apiData.pages}
                onChangePage={onPageChange}
                currentPage={filters.page ?? 1}
            />
        </div>
    );
}
