import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {AdvancedSearchFilters} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {Separator} from "@/lib/client/components/ui/separator";
import {ChevronLeft, ChevronRight, Search} from "lucide-react";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {Link, LinkProps, useRouter, useRouterState} from "@tanstack/react-router";
import {MediaSearchResult} from "@/lib/client/components/media/base/MediaSearchResult";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";
import {AdvancedSearchDialog, getAdvancedSearchLabel,} from "@/lib/client/components/search/AdvancedSearchDialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface SearchBarProps {
    setMobileMenu?: React.Dispatch<React.SetStateAction<boolean>>;
}


export const SearchBar = ({ setMobileMenu }: SearchBarProps) => {
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [prevSelector, setPrevSelector] = useState(currentUser?.searchSelector);
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>();
    const [isAdvancedDialogOpen, setIsAdvancedDialogOpen] = useState(false);
    const [selectDrop, setSelectDrop] = useState<ApiProviderType>(currentUser?.searchSelector ?? ApiProviderType.USERS);

    const { search, setSearch, setIsOpen, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({
        outsideClickEnabled: !isAdvancedDialogOpen,
        onReset: () => {
            setPage(1);
            setAdvancedFilters(undefined);
        },
    });

    const submittedQuery = advancedFilters ? search : debouncedSearch;
    const advancedSearchLabel = advancedFilters ? getAdvancedSearchLabel(advancedFilters) : debouncedSearch;
    const { data: searchResults, isFetching, error } = useQuery(navSearchOptions(submittedQuery, page, selectDrop, advancedFilters));

    if (prevSelector !== currentUser?.searchSelector) {
        setPrevSelector(currentUser?.searchSelector);
        setSelectDrop(currentUser?.searchSelector ?? ApiProviderType.USERS);
    }

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

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setAdvancedFilters(undefined);
        setSearch(ev.target.value);
    };

    const handleValueChange = (value: ApiProviderType | null) => {
        if (value === null) return;
        reset();
        setSelectDrop(value);
    };

    const handleAdvancedApply = (nextQuery: string, filters: AdvancedSearchFilters) => {
        setPage(1);
        setAdvancedFilters(filters);
        setSearch(nextQuery);
        setIsOpen(true);
    };

    const handleAdvancedClear = () => {
        setPage(1);
        setAdvancedFilters(undefined);
        setIsOpen(search.trim().length > 0);
    };

    return (
        <div ref={containerRef}>
            <InputGroup>
                <InputGroupInput
                    type="search"
                    value={search}
                    onChange={handleInputChange}
                    className="placeholder:text-sm"
                    aria-label="Search for media or users"
                    placeholder="Search for media / users..."
                />
                <InputGroupAddon align="inline-start">
                    <Search aria-hidden="true"/>
                </InputGroupAddon>
                <InputGroupAddon align="inline-end" className="h-full p-0 has-[>button]:mr-0">
                    <AdvancedSearchDialog
                        query={search}
                        provider={selectDrop}
                        triggerVariant="compact"
                        onApply={handleAdvancedApply}
                        onClear={handleAdvancedClear}
                        advancedFilters={advancedFilters}
                        onDialogOpenChange={setIsAdvancedDialogOpen}
                    />
                    <Select value={selectDrop} items={searchProviderItems} onValueChange={handleValueChange}>
                        <SelectTrigger variant="inputGroup" aria-label="Search provider" className="min-w-25">
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
                </InputGroupAddon>
            </InputGroup>

            <SearchContainer
                error={error}
                isOpen={isOpen}
                isPending={isFetching}
                className="max-w-md -mt-2"
                debouncedSearch={advancedSearchLabel}
                hasResults={!!searchResults?.data.length}
                search={advancedFilters ? "advanced" : search}
                emptyMessage={advancedFilters ? `No results found for ${advancedSearchLabel}.` : undefined}
            >
                <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-90">
                    {searchResults?.data.map((item) =>
                        <SearchComponent
                            item={item}
                            key={item.id}
                            resetSearch={reset}
                            setMobileMenu={setMobileMenu}
                        />
                    )}
                    {searchResults && searchResults.data.length > 0 &&
                        <div className="flex justify-end items-center p-4">
                            <ButtonGroup aria-label="Search result pages">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page === 1}
                                    aria-label="Previous search result page"
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <ChevronLeft/> Prev.
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label="Next search result page"
                                    disabled={!searchResults?.hasNextPage}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next <ChevronRight/>
                                </Button>
                            </ButtonGroup>
                        </div>
                    }
                </div>
            </SearchContainer>
        </div>
    );
};


interface SearchComponentProps {
    resetSearch: () => void;
    setMobileMenu?: React.Dispatch<React.SetStateAction<boolean>>;
    item: NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof navSearchOptions>["queryFn"]>>>>["data"][0];
}


const SearchComponent = ({ item, resetSearch, setMobileMenu }: SearchComponentProps) => {
    const router = useRouter();
    const destination = createDestParams();
    const routerStatus = useRouterState({ select: (state) => state.status });
    const [clickedApiId, setClickedApiId] = useState<number | string | null>(null);

    const isLoading = routerStatus === "pending";
    const isLoadingItem = isLoading && (clickedApiId === item.id);

    const handleLinkClick = () => {
        if (isLoading) return;

        setClickedApiId(item.id);
        router.subscribe("onResolved", () => {
            resetSearch();
            setMobileMenu?.(false);
        });
    };

    function createDestParams(): LinkProps {
        if (item.itemType === ApiProviderType.USERS) {
            return { to: "/profile/$username", params: { username: item.name } };
        }
        return {
            to: "/details/$mediaType/external/$apiId",
            params: { mediaType: item.itemType as MediaType, apiId: item.id.toString() },
        };
    }

    return (
        <Link {...destination} onClick={handleLinkClick} disabled={isLoading}>
            <MediaSearchResult
                item={item}
                isPending={isLoadingItem}
            />
            <Separator className="m-0"/>
        </Link>
    );
};
