import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Search, SlidersHorizontal} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Link, useNavigate} from "@tanstack/react-router";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {getAdvancedSearchConfig} from "@/lib/client/components/media/media-config";
import {NavbarSearchResults} from "@/lib/client/components/navbar/NavbarSearchResults";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface SearchBarProps {
    setMobileMenu?: React.Dispatch<React.SetStateAction<boolean>>;
}


export const SearchBar = ({ setMobileMenu }: SearchBarProps) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [prevSelector, setPrevSelector] = useState(currentUser?.searchSelector);
    const [selectDrop, setSelectDrop] = useState<ApiProviderType>(currentUser?.searchSelector ?? ApiProviderType.USERS);

    const { search, setSearch, setIsOpen, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({
        resetOnOutsideClick: false,
        onReset: () => setPage(1),
    });

    const { data: searchResults, isFetching, error } = useQuery(navSearchOptions(debouncedSearch, page, selectDrop));

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
        setSearch(ev.target.value);
    };

    const handleValueChange = (value: ApiProviderType | null) => {
        if (value === null) return;
        reset();
        setSelectDrop(value);
    };

    const handleSearchSubmit = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key !== "Enter" || ev.nativeEvent.isComposing) return;
        if (!currentUser) {
            ev.preventDefault();
            return;
        }

        const query = search.trim();
        if (query.length < 2) return;

        ev.preventDefault();
        ev.currentTarget.blur();

        setPage(1);
        setIsOpen(false);
        setMobileMenu?.(false);

        void navigate({ to: "/search", search: { query, page: 1, apiProvider: selectDrop, advancedFilters: undefined } });
        reset();
    };

    return (
        <div ref={containerRef} className="relative">
            <InputGroup>
                <InputGroupInput
                    type="search"
                    value={search}
                    onChange={handleInputChange}
                    onKeyDown={handleSearchSubmit}
                    aria-label="Search for media or users"
                    placeholder="Search for media or users..."
                    className="placeholder:text-xs sm:placeholder:text-sm"
                    onFocus={() => {
                        if (search.trim()) setIsOpen(true);
                    }}
                />
                <InputGroupAddon align="inline-start">
                    <Search aria-hidden="true"/>
                </InputGroupAddon>
                <InputGroupAddon align="inline-end" className="h-full p-0 has-[>button]:mr-0">
                    {getAdvancedSearchConfig(selectDrop) &&
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            nativeButton={false}
                            title="Open Advanced Search"
                            aria-label="Open Advanced Search"
                            render={
                                <Link
                                    to="/search"
                                    search={{ page: 1, query: search.trim(), apiProvider: selectDrop, advancedFilters: undefined }}
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        setIsOpen(false);
                                        setMobileMenu?.(false);
                                    }}
                                />
                            }
                        >
                            <SlidersHorizontal/>
                        </Button>
                    }
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
                search={search}
                isPending={isFetching}
                debouncedSearch={debouncedSearch}
                hasResults={!!searchResults?.data.length}
                className="mt-2 max-w-md rounded-2xl border-border/80 shadow-2xl shadow-black/15"
            >
                {searchResults && searchResults.data.length > 0 &&
                    <NavbarSearchResults
                        page={page}
                        onPageChange={setPage}
                        items={searchResults.data}
                        currentUserId={currentUser?.id}
                        hasNextPage={searchResults.hasNextPage}
                        providerLabel={searchProviderItems.find(({ value }) => value === selectDrop)?.label ?? "Search"}
                        onNavigate={() => {
                            reset();
                            setMobileMenu?.(false);
                        }}
                    />
                }
            </SearchContainer>
        </div>
    );
};
