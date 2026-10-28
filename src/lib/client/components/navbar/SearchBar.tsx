import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ApiProviderType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Search, SlidersHorizontal} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Link, useNavigate} from "@tanstack/react-router";
import {supportsAdvancedSearch} from "@/lib/schemas/search.schema";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {useSearchAnalytics} from "@/lib/client/hooks/use-search-analytics";
import {useNavbarSearch} from "@/lib/client/components/navbar/use-navbar-search";
import {getSearchProviderItems} from "@/lib/client/components/navbar/navbar-search";
import {NavbarSearchResults} from "@/lib/client/components/navbar/NavbarSearchResults";
import {NavbarSearchDropdown} from "@/lib/client/components/navbar/NavbarSearchDropdown";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/lib/client/components/ui/input-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const SearchBar = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [prevSelector, setPrevSelector] = useState(currentUser?.searchSelector);
    const [selectDrop, setSelectDrop] = useState<ApiProviderType>(currentUser?.searchSelector ?? ApiProviderType.USERS);
    const { search, setSearch, setIsOpen, debouncedSearch, isOpen, reset, containerRef } = useNavbarSearch(() => setPage(1));

    const { data: searchResults, isFetching, error } = useQuery(navSearchOptions(debouncedSearch, page, selectDrop));

    useSearchAnalytics([debouncedSearch.trim(), page, selectDrop], "navbar", selectDrop, page,
        searchResults?.data.length, isOpen && !isFetching
        && !error && search.trim() === debouncedSearch.trim() && debouncedSearch.trim().length >= 2);

    if (prevSelector !== currentUser?.searchSelector) {
        setPrevSelector(currentUser?.searchSelector);
        setSelectDrop(currentUser?.searchSelector ?? ApiProviderType.USERS);
    }

    const searchProviderItems = getSearchProviderItems(currentUser?.settings);

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setSearch(ev.target.value);
    };

    const handleValueChange = (value: ApiProviderType | null) => {
        if (value === null) return;
        setPage(1);
        setSelectDrop(value);
        setIsOpen(search.trim().length > 0);
    };

    const handleSearchLinkClick = (ev: React.MouseEvent<HTMLAnchorElement>) => {
        ev.stopPropagation();
        setIsOpen(false);
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
                <InputGroupAddon align="inline-start" className="h-full p-0">
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Open Search"
                        nativeButton={false}
                        aria-label="Open Search"
                        render={
                            <Link
                                to="/search"
                                onClick={handleSearchLinkClick}
                                search={{ page: 1, query: search.trim(), apiProvider: selectDrop, advancedFilters: undefined }}
                            />
                        }
                    >
                        <Search aria-hidden="true"/>
                    </Button>
                </InputGroupAddon>
                <InputGroupAddon align="inline-end" className="h-full p-0 has-[>button]:mr-0">
                    {supportsAdvancedSearch(selectDrop) &&
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            nativeButton={false}
                            title="Open Advanced Search"
                            aria-label="Open Advanced Search"
                            render={
                                <Link
                                    to="/search"
                                    onClick={handleSearchLinkClick}
                                    search={{ page: 1, query: search.trim(), apiProvider: selectDrop, advancedFilters: undefined }}
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

            <NavbarSearchDropdown
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
                        search={search}
                        onNavigate={reset}
                        provider={selectDrop}
                        onPageChange={setPage}
                        items={searchResults.data}
                        currentUserId={currentUser?.id}
                        hasNextPage={searchResults.hasNextPage}
                        providerLabel={searchProviderItems.find(({ value }) => value === selectDrop)?.label ?? "Search"}
                    />
                }
            </NavbarSearchDropdown>
        </div>
    );
};
