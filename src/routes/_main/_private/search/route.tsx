import {useEffect} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDate} from "@/lib/utils/date-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {Field, FieldError} from "@/lib/client/components/ui/field";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {AdvancedSearchFilters, globalSearchSchema} from "@/lib/schemas";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {Controller, FormProvider, useForm, useWatch} from "react-hook-form";
import {getAdvancedSearchConfig} from "@/lib/client/components/media/media-config";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal} from "lucide-react";
import {countAdvancedSearchFilters, hasSearchCriteria} from "@/lib/utils/advanced-search.utils";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const Route = createFileRoute("/_main/_private/search")({
    validateSearch: globalSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        const { query = "", page = 1, apiProvider = ApiProviderType.TMDB, advancedFilters } = search;
        if (!hasSearchCriteria(query, advancedFilters)) return;
        return queryClient.ensureQueryData(navSearchOptions(query, page, apiProvider, advancedFilters));
    },
    component: SearchPage,
});


interface SearchFormValues {
    query: string;
    apiProvider: ApiProviderType;
    advancedFilters?: AdvancedSearchFilters;
}


const createFormValues = (query: string, apiProvider: ApiProviderType, advancedFilters?: AdvancedSearchFilters) => {
    return {
        query,
        apiProvider,
        advancedFilters: getAdvancedSearchConfig(apiProvider)?.createFilters(advancedFilters),
    };
}


function SearchPage() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { query = "", page = 1, apiProvider = ApiProviderType.TMDB, advancedFilters } = filters;
    const form = useForm<SearchFormValues>({ defaultValues: createFormValues(query, apiProvider, advancedFilters) });

    const draftFilters = useWatch({ control: form.control, name: "advancedFilters" });
    const selectedProvider = useWatch({ control: form.control, name: "apiProvider" });

    const definition = getAdvancedSearchConfig(selectedProvider);

    useEffect(() => {
        form.reset(createFormValues(query, apiProvider, advancedFilters));
    }, [advancedFilters, apiProvider, form, query]);

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

    const commitSearch = async (submitted: SearchFormValues) => {
        const trimmedQuery = submitted.query.trim();
        let filtersToApply: AdvancedSearchFilters | undefined;
        const selectedDefinition = getAdvancedSearchConfig(submitted.apiProvider);

        if (!selectedDefinition && trimmedQuery.length === 1) {
            form.setError("query", { type: "validate", message: "Enter at least two characters." });
            return;
        }

        if (selectedDefinition) {
            const submittedFilters = submitted.advancedFilters ?? selectedDefinition.createFilters();
            const validationError = selectedDefinition.validate(trimmedQuery, submittedFilters);
            if (validationError) {
                form.setError("root", { type: "validate", message: validationError });
                return;
            }

            const cleanedFilters = selectedDefinition.cleanFilters(submittedFilters);
            filtersToApply = countAdvancedSearchFilters(cleanedFilters) > 0 ? cleanedFilters : undefined;
            form.setValue("advancedFilters", cleanedFilters);
        }
        else if (trimmedQuery.length < 2) {
            form.setError("query", { type: "validate", message: "Enter at least two characters to search." });
            return;
        }

        form.clearErrors();
        await navigate({ search: { page: 1, query: trimmedQuery, apiProvider: submitted.apiProvider, advancedFilters: filtersToApply } });
    };

    const handleProviderChange = (provider: ApiProviderType | null) => {
        if (!provider) return;

        form.clearErrors();
        form.setValue("apiProvider", provider, { shouldDirty: true });
        form.setValue("advancedFilters", getAdvancedSearchConfig(provider)?.createFilters(), { shouldDirty: true });
    };

    const handleAppliedFiltersChange = (filters: AdvancedSearchFilters) => {
        form.reset(createFormValues(query, apiProvider, filters));
        void commitAppliedFilters(filters);
    };

    const commitAppliedFilters = async (filters: AdvancedSearchFilters) => {
        const filterDefinition = getAdvancedSearchConfig(apiProvider);
        if (!filterDefinition) return;

        const cleanedFilters = filterDefinition.cleanFilters(filters);
        const nextFilters = countAdvancedSearchFilters(cleanedFilters) > 0 ? cleanedFilters : undefined;
        form.clearErrors();

        await navigate({ search: { query, page: 1, apiProvider, advancedFilters: nextFilters } });
    };

    const handleClearFilters = async () => {
        form.clearErrors();
        form.setValue("advancedFilters", definition?.createFilters(), { shouldDirty: true });

        if (selectedProvider !== apiProvider || !advancedFilters) return;
        await navigate({ search: { query, page: 1, apiProvider, advancedFilters: undefined } });
    };

    const handlePageChange = async (nextPage: number) => {
        await navigate({ search: { query, page: nextPage, apiProvider, advancedFilters } });
    };

    return (
        <PageTitle title="Search" subtitle="A focused place to search your active catalogs.">
            <FormProvider {...form}>
                <div className="mt-2 space-y-6">
                    <form onSubmit={form.handleSubmit(commitSearch)} className="space-y-6">
                        <div className="flex items-start gap-3 max-sm:flex-col">
                            <Controller
                                name="apiProvider"
                                control={form.control}
                                render={({ field }) =>
                                    <Select value={field.value} items={searchProviderItems} onValueChange={handleProviderChange}>
                                        <SelectTrigger aria-label="Search provider" className="w-full sm:w-36">
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
                                }
                            />

                            <Controller
                                name="query"
                                control={form.control}
                                render={({ field, fieldState }) =>
                                    <Field data-invalid={fieldState.invalid}>
                                        <SearchInput
                                            {...field}
                                            autoFocus={true}
                                            aria-invalid={fieldState.invalid}
                                            aria-label={"Search title or name"}
                                            inputClassName="placeholder:text-xs sm:placeholder:text-sm"
                                            placeholder={definition ? "Title (optional when filters are selected)" : "Title or Name"}
                                            onChange={(ev) => {
                                                field.onChange(ev);
                                                form.clearErrors();
                                            }}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            <Button type="submit">
                                <Search data-icon="inline-start"/>
                                Search
                            </Button>
                        </div>

                        {definition && SearchFilterPanel && draftFilters &&
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal className="size-4"/>
                                            {definition.label}
                                        </div>
                                    </CardTitle>
                                    <CardAction>
                                        {draftFilterCount > 0 &&
                                            <Badge variant="secondary">
                                                {draftFilterCount} selected
                                            </Badge>
                                        }
                                    </CardAction>
                                    <CardDescription>
                                        Select and adjust the advanced fields as you need.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <Controller
                                        name="advancedFilters"
                                        control={form.control}
                                        render={({ field }) => {
                                            if (!field.value) return <></>;

                                            return (
                                                <SearchFilterPanel
                                                    filters={field.value}
                                                    onChange={(filters) => {
                                                        field.onChange(filters);
                                                        form.clearErrors("root");
                                                    }}
                                                />
                                            );
                                        }}
                                    />
                                </CardContent>

                                <CardFooter className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center">
                                    <FieldError
                                        className="sm:mr-auto"
                                        errors={[form.formState.errors.root]}
                                    />
                                    <div className="flex justify-end gap-2 sm:ml-auto">
                                        <Button
                                            size="sm"
                                            type="button"
                                            variant="hover"
                                            onClick={() => void handleClearFilters()}
                                            disabled={draftFilterCount === 0 && (!isViewingAppliedProvider || appliedFilterCount === 0)}
                                        >
                                            Clear filters
                                        </Button>
                                        <Button type="submit" size="sm">
                                            <Search data-icon="inline-start"/>
                                            Apply search
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        }
                    </form>

                    {isViewingAppliedProvider && AppliedFilterChips && advancedFilters && appliedFilterCount > 0 &&
                        <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
                            <span className="text-xs font-medium text-muted-foreground">
                                Applied
                            </span>

                            <AppliedFilterChips
                                filters={advancedFilters}
                                onChange={handleAppliedFiltersChange}
                            />

                            <Button type="button" size="xs" variant="hover" onClick={() => void handleClearFilters()}>
                                Clear all
                            </Button>
                        </div>
                    }

                    {hasSubmittedSearch ?
                        <SearchResultsQuery
                            page={page}
                            query={query}
                            apiProvider={apiProvider}
                            onPageChange={handlePageChange}
                            advancedFilters={advancedFilters}
                        />
                        :
                        <EmptyState
                            icon={Search}
                            className="min-h-48 rounded-xl border px-4 py-10 text-center"
                            message="Choose a media type, add a title or filters, then search."
                        />
                    }
                </div>
            </FormProvider>
        </PageTitle>
    );
}


interface SearchResultsQueryProps {
    page: number;
    query: string;
    apiProvider: ApiProviderType;
    advancedFilters?: AdvancedSearchFilters;
    onPageChange: (page: number) => Promise<void>;
}


const SearchResultsQuery = (props: SearchResultsQueryProps) => {
    const { query, page, apiProvider, advancedFilters, onPageChange } = props;
    const { data } = useSuspenseQuery(navSearchOptions(query, page, apiProvider, advancedFilters));

    return (
        <SearchResults
            page={page}
            data={data.data}
            onPageChange={onPageChange}
            hasNextPage={data.hasNextPage}
        />
    );
};


interface SearchResultsProps {
    page: number;
    hasNextPage: boolean;
    data: ProviderSearchResult[];
    onPageChange: (page: number) => Promise<void>;
}


const SearchResults = ({ data, page, hasNextPage, onPageChange }: SearchResultsProps) => {
    if (data.length === 0) {
        return (
            <EmptyState
                icon={SearchX}
                className="min-h-48 rounded-xl border px-4 py-10 text-center"
                message="No results found. Try a broader title or remove one of the applied filters."
            />
        );
    }

    return (
        <section aria-labelledby="search-results-heading" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h2 id="search-results-heading" className="text-lg font-semibold">
                    Results
                </h2>
                <Badge variant="outline">
                    Page {page}
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
                <div className="flex justify-end pt-2">
                    <ButtonGroup aria-label="Search result pages">
                        <Button variant="outline" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
                            <ChevronLeft data-icon="inline-start"/> Prev.
                        </Button>
                        <Button variant="outline" disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
                            Next <ChevronRight data-icon="inline-end"/>
                        </Button>
                    </ButtonGroup>
                </div>
            }
        </section>
    );
};


const SearchResultCard = ({ item }: { item: ProviderSearchResult }) => {
    if (item.itemType !== ApiProviderType.USERS) {
        return (
            <MediaCard
                external
                mediaType={item.itemType as MediaType}
                item={{ mediaId: item.id, mediaName: item.name, imageCover: item.image }}
            >
                <MediaCardFooter>
                    <MediaCardTitle title={item.name}>
                        {item.name}
                    </MediaCardTitle>
                    {item.date &&
                        <MediaCardMeta>
                            <MediaCardDetails>
                                <MediaTypeIcon mediaType={item.itemType}/>
                                {formatDate(item.date)}
                            </MediaCardDetails>
                        </MediaCardMeta>
                    }
                </MediaCardFooter>
            </MediaCard>
        );
    }

    return (
        <Card className="gap-0 py-0 transition-colors hover:ring-foreground/25">
            <Link
                to="/profile/$username"
                params={{ username: item.name }}
                className="group relative aspect-2/3 overflow-hidden rounded-xl"
            >
                <img
                    loading="lazy"
                    alt={item.name}
                    src={item.image}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div
                    className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/70 to-transparent px-3
                    pb-3 pt-10 text-white"
                >
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
