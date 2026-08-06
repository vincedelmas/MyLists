import {useQuery} from "@tanstack/react-query";
import React, {useEffect, useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDate} from "@/lib/utils/date-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {FieldError} from "@/lib/client/components/ui/field";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {AdvancedSearchFilters, globalSearchSchema} from "@/lib/schemas";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {countAdvancedSearchFilters} from "@/lib/utils/advanced-search.utils";
import {ChevronLeft, ChevronRight, Search, SlidersHorizontal, X} from "lucide-react";
import {getSearchFilterDefinition} from "@/lib/client/components/search/advanced-search/search-filter.registry";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/search")({
    validateSearch: globalSearchSchema,
    component: SearchPage,
});


function SearchPage() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { query = "", page = 1, apiProvider = ApiProviderType.TMDB, advancedFilters } = filters;

    const [formError, setFormError] = useState<string>();
    const [currentSearch, setCurrentSearch] = useState(query);
    const [selectedProvider, setSelectedProvider] = useState(apiProvider);

    const definition = getSearchFilterDefinition(selectedProvider);
    const { data: apiData, isLoading, error } = useQuery(navSearchOptions(query, page, apiProvider, advancedFilters));
    const [draftFilters, setDraftFilters] = useState<AdvancedSearchFilters | undefined>(() => {
        return getSearchFilterDefinition(apiProvider)?.createFilters(advancedFilters);
    });

    useEffect(() => {
        setCurrentSearch(query);
        setFormError(undefined);
        setSelectedProvider(apiProvider);
        setDraftFilters(getSearchFilterDefinition(apiProvider)?.createFilters(advancedFilters));
    }, [advancedFilters, apiProvider, query]);

    const SearchFilterPanel = definition?.FilterPanel;
    const AppliedFilterChips = definition?.AppliedFilters;

    const draftFilterCount = countAdvancedSearchFilters(draftFilters);
    const appliedFilterCount = countAdvancedSearchFilters(advancedFilters);

    const isViewingAppliedProvider = selectedProvider === apiProvider;
    const hasSubmittedSearch = isViewingAppliedProvider && (query.trim().length >= 2 || appliedFilterCount > 0);

    const searchProviderItems = [
        { label: "Media", value: ApiProviderType.TMDB },
        ...(resolveMediaTypeActive(currentUser?.settings, MediaType.BOOKS)
            ? [{ label: "Books", value: ApiProviderType.BOOKS }]
            : []),
        ...(resolveMediaTypeActive(currentUser?.settings, MediaType.GAMES)
            ? [{ label: "Games", value: ApiProviderType.IGDB }]
            : []),
        ...(resolveMediaTypeActive(currentUser?.settings, MediaType.MANGA)
            ? [{ label: "Manga", value: ApiProviderType.MANGA }]
            : []),
        { label: "Users", value: ApiProviderType.USERS },
    ];

    const commitSearch = async (nextFilters = draftFilters) => {
        const trimmedQuery = currentSearch.trim();
        let filtersToApply: AdvancedSearchFilters | undefined;

        if (definition) {
            const cleanedFilters = definition.cleanFilters(nextFilters ?? definition.createFilters());
            const validationError = definition.validate(trimmedQuery, cleanedFilters);
            if (validationError) {
                setFormError(validationError);
                return;
            }

            filtersToApply = countAdvancedSearchFilters(cleanedFilters) > 0 ? cleanedFilters : undefined;
            setDraftFilters(cleanedFilters);
        }
        else if (trimmedQuery.length < 2) {
            setFormError("Enter at least two characters to search.");
            return;
        }

        setFormError(undefined);
        await navigate({ search: { page: 1, query: trimmedQuery, apiProvider: selectedProvider, advancedFilters: filtersToApply } });
    };

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        void commitSearch();
    };

    const handleProviderChange = (provider: ApiProviderType | null) => {
        if (!provider) return;
        setFormError(undefined);
        setSelectedProvider(provider);
        setDraftFilters(getSearchFilterDefinition(provider)?.createFilters());
    };

    const handleDraftFiltersChange = (filters: AdvancedSearchFilters) => {
        setDraftFilters(filters);
        setFormError(undefined);
    };

    const handleAppliedFiltersChange = (filters: AdvancedSearchFilters) => {
        setCurrentSearch(query);
        setDraftFilters(filters);
        setSelectedProvider(apiProvider);
        void commitAppliedFilters(filters);
    };

    const commitAppliedFilters = async (filters: AdvancedSearchFilters) => {
        const filterDefinition = getSearchFilterDefinition(apiProvider);
        if (!filterDefinition) return;

        const cleanedFilters = filterDefinition.cleanFilters(filters);
        const nextFilters = countAdvancedSearchFilters(cleanedFilters) > 0 ? cleanedFilters : undefined;
        setFormError(undefined);

        await navigate({ search: { query, page: 1, apiProvider, advancedFilters: nextFilters } });
    };

    const handleClearFilters = async () => {
        setFormError(undefined);
        setDraftFilters(definition?.createFilters());

        if (selectedProvider !== apiProvider || !advancedFilters) return;
        await navigate({ search: { query, page: 1, apiProvider, advancedFilters: undefined } });
    };

    const handlePageChange = async (nextPage: number) => {
        await navigate({ search: { query, page: nextPage, apiProvider, advancedFilters } });
    };

    return (
        <PageTitle title="Search" subtitle="A focused place to search your active catalogs.">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                <Card className="gap-0 py-0">
                    <CardContent className="p-4 sm:p-5">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                            <Select value={selectedProvider} items={searchProviderItems} onValueChange={handleProviderChange}>
                                <SelectTrigger aria-label="Search provider" className="h-9 w-full sm:w-36">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectGroup>
                                        {searchProviderItems.map((item) =>
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <SearchInput
                                autoFocus
                                value={currentSearch}
                                className="h-9 flex-1"
                                aria-label="Search title or name"
                                inputClassName="placeholder:text-xs sm:placeholder:text-sm"
                                placeholder={definition ? "Title (optional when filters are selected)" : "Title or name"}
                                onChange={(ev) => {
                                    setFormError(undefined);
                                    setCurrentSearch(ev.target.value);
                                }}
                            />

                            <Button type="submit" size="lg" className="h-9 px-4">
                                <Search data-icon="inline-start"/>
                                Search
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {definition && SearchFilterPanel && draftFilters &&
                    <Card className="gap-0 py-0">
                        <CardHeader className="border-b py-4">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="size-4 text-muted-foreground"/>
                                <CardTitle>{definition.label}</CardTitle>
                                {draftFilterCount > 0 &&
                                    <Badge variant="secondary">
                                        {draftFilterCount} selected
                                    </Badge>
                                }
                            </div>
                            <CardDescription>
                                Adjust as many fields as you need. Nothing runs until you apply the search.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="py-4">
                            <SearchFilterPanel
                                filters={draftFilters}
                                onChange={handleDraftFiltersChange}
                            />
                        </CardContent>

                        <CardFooter className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center">
                            {formError &&
                                <FieldError className="sm:mr-auto">
                                    {formError}
                                </FieldError>
                            }
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void handleClearFilters()}
                                    disabled={draftFilterCount === 0 && (!isViewingAppliedProvider || appliedFilterCount === 0)}
                                >
                                    Clear filters
                                </Button>
                                <Button type="button" size="sm" onClick={() => void commitSearch()}>
                                    <Search data-icon="inline-start"/>
                                    Apply search
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                }

                {(!definition && formError) &&
                    <FieldError>
                        {formError}
                    </FieldError>
                }

                {isViewingAppliedProvider && AppliedFilterChips && advancedFilters && appliedFilterCount > 0 &&
                    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
                        <span className="mr-1 text-xs font-medium text-muted-foreground">
                            Applied
                        </span>

                        <AppliedFilterChips
                            filters={advancedFilters}
                            onChange={handleAppliedFiltersChange}
                        />

                        <Button type="button" size="xs" variant="ghost" onClick={() => void handleClearFilters()}>
                            Clear all
                        </Button>
                    </div>
                }

                <SearchResults
                    page={page}
                    error={error}
                    data={apiData?.data}
                    isLoading={isLoading}
                    onPageChange={handlePageChange}
                    hasSubmittedSearch={hasSubmittedSearch}
                    hasNextPage={apiData?.hasNextPage ?? false}
                />
            </div>
        </PageTitle>
    );
}


interface SearchResultsProps {
    page: number;
    isLoading: boolean;
    error: Error | null;
    hasNextPage: boolean;
    hasSubmittedSearch: boolean;
    data?: ProviderSearchResult[];
    onPageChange: (page: number) => Promise<void>;
}


const SearchResults = ({ data, error, isLoading, page, hasNextPage, hasSubmittedSearch, onPageChange }: SearchResultsProps) => {
    if (isLoading) {
        return (
            <div className="flex min-h-48 items-center justify-center" aria-label="Loading search results">
                <Spinner className="size-7"/>
            </div>
        );
    }

    if (error) {
        return (
            <SearchStatus
                icon={<X/>}
                title="Search unavailable"
                description={error.message}
            />
        );
    }

    if (!hasSubmittedSearch) {
        return (
            <SearchStatus
                icon={<Search/>}
                title="Ready when you are"
                description="Choose a catalog, add a title or filters, then search."
            />
        );
    }

    if (data?.length === 0) {
        return (
            <SearchStatus
                icon={<Search/>}
                title="No results found"
                description="Try a broader title or remove one of the applied filters."
            />
        );
    }

    if (!data?.length) return null;

    return (
        <section aria-labelledby="search-results-heading" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h2 id="search-results-heading" className="text-lg font-semibold">
                    Results
                </h2>
                <Badge variant="secondary">
                    {data.length} on this page
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {data.map((item) =>
                    <SearchResultCard
                        item={item}
                        key={`${item.itemType}-${item.id}`}
                    />
                )}
            </div>

            {(page > 1 || hasNextPage) &&
                <div className="flex justify-center pt-2">
                    <ButtonGroup aria-label="Search result pages">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => void onPageChange(page - 1)}
                        >
                            <ChevronLeft data-icon="inline-start"/> Previous
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasNextPage}
                            onClick={() => void onPageChange(page + 1)}
                        >
                            Next <ChevronRight data-icon="inline-end"/>
                        </Button>
                    </ButtonGroup>
                </div>
            }
        </section>
    );
};


const SearchResultCard = ({ item }: { item: ProviderSearchResult }) => {
    const destination = item.itemType === ApiProviderType.USERS
        ? { to: "/profile/$username" as const, params: { username: item.name } }
        : {
            to: "/details/$mediaType/external/$apiId" as const,
            params: { mediaType: item.itemType as MediaType, apiId: item.id.toString() },
        };

    return (
        <Card className="gap-0 py-0 transition-colors hover:ring-foreground/25">
            <Link {...destination} className="group relative aspect-2/3 overflow-hidden rounded-xl">
                <img
                    alt=""
                    loading="lazy"
                    src={item.image}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/70 to-transparent px-3
                pb-3 pt-10 text-white">
                    <div className="truncate font-medium">
                        {item.name}
                    </div>
                    {item.date &&
                        <div className="mt-0.5 text-xs text-white/70">
                            {formatDate(item.date)}
                        </div>
                    }
                </div>
            </Link>
        </Card>
    );
};


interface SearchStatusProps {
    title: string;
    description: string;
    icon: React.ReactNode;
}


const SearchStatus = ({ icon, title, description }: SearchStatusProps) => (
    <Card className="items-center gap-2 py-10 text-center">
        <div className="text-muted-foreground [&_svg]:size-7">
            {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md px-4">
            {description}
        </CardDescription>
    </Card>
);
