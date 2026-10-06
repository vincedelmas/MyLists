import {THEME_ICONS_MAP} from "@/lib/client/theme";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaDetailsJobSchema} from "@/lib/schemas";
import {capitalize} from "@/lib/utils/formatting/text";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {jobDetailsOptions} from "@/lib/client/react-query/query-options";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import {MediaBrowseResults} from "@/lib/client/components/media/browse/MediaBrowseResults";
import {MEDIA_BROWSE_LIBRARY_OPTIONS} from "@/lib/client/components/media/browse/media-browse.config";
import {mediaCatalogBrowseSearchSchema, type MediaCatalogBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {BrowseAppliedFilters, type MediaBrowseFilterKey} from "@/lib/client/components/media/browse/AppliedFilters";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$job/$name")({
    params: {
        parse: (params) => {
            const result = mediaDetailsJobSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: mediaCatalogBrowseSearchSchema,
    loaderDeps: ({ search: { display: _display, ...filters } }) => ({ filters }),
    context: ({ params: { mediaType, job, name }, deps: { filters } }) => ({
        jobDetailsQueryOptions: jobDetailsOptions(mediaType, job, name, filters),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.jobDetailsQueryOptions);
    },
    component: JobInfoPage,
});


function JobInfoPage() {
    const filters = Route.useSearch();
    const { isAnonymous } = useAuth();
    const navigate = Route.useNavigate();
    const { mediaType, job, name } = Route.useParams();
    const { jobDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(jobDetailsQueryOptions).data;
    const searchInput = useSearchNavigate<MediaCatalogBrowseFilters>({ search: filters.search ?? "" });

    const isGrid = filters.display !== "table";
    const MediaIcon = THEME_ICONS_MAP[mediaType];

    const sortingOptions = getMediaSortOptions([mediaType], false);
    const { label, icon: JobIcon, sectionTitle, descriptionVerb, descriptionSuffix } = getMediaConfig(mediaType).jobs[job]!;

    const handleFilterChange = (patch: Partial<MediaCatalogBrowseFilters>) => {
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

    const onPageChange = async (newPage: number) => {
        await navigate({ search: prev => ({ ...prev, page: newPage }) });
    };

    return (
        <PageTitle title={`${name}'s ${capitalize(mediaType)}`} onlyHelmet>
            <div className="mb-8 flex min-w-0 flex-col pt-8">
                <PageHeader
                    title={name}
                    asideIcon={MediaIcon}
                    eyebrowIcon={JobIcon}
                    eyebrow={`${label} · ${capitalize(mediaType)}`}
                    asideLabel={`In this ${sectionTitle.toLowerCase()}`}
                    description={`${capitalize(mediaType)} ${descriptionVerb} ${name}${descriptionSuffix}.`}
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "title" : "titles"}</>}
                />

                <div className="flex flex-col gap-4 pb-5 pt-4">
                    <MediaBrowseToolbar
                        isGrid={isGrid}
                        search={searchInput.localSearch}
                        searchLabel={"Search these titles"}
                        onSearchChange={searchInput.handleInputChange}
                        searchPlaceholder={`Search this ${sectionTitle.toLowerCase()}...`}
                        onGridClick={() => void navigate({
                            replace: true,
                            search: prev => ({ ...prev, display: isGrid ? "table" : "grid" }),
                        })}
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
                        personal={false}
                        showMembership={!isAnonymous}
                        display={isGrid ? "grid" : "table"}
                        items={apiData.items.map(item => ({ ...item, mediaType, title: item.mediaName }))}
                    />
                    :
                    <EmptyState
                        icon={JobIcon}
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

        </PageTitle>
    );
}
