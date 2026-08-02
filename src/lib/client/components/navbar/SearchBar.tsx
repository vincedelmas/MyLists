import React, {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {formatDate} from "@/lib/utils/date-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {Separator} from "@/lib/client/components/ui/separator";
import {ChevronLeft, ChevronRight, Search, X} from "lucide-react";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {Link, LinkProps, useRouter, useRouterState} from "@tanstack/react-router";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface SearchBarProps {
    setMobileMenu?: React.Dispatch<React.SetStateAction<boolean>>;
}


export const SearchBar = ({ setMobileMenu }: SearchBarProps) => {
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [selectOpen, setSelectOpen] = useState(false);
    const [prevSelector, setPrevSelector] = useState(currentUser?.searchSelector);
    const [selectDrop, setSelectDrop] = useState<ApiProviderType>(currentUser?.searchSelector ?? ApiProviderType.USERS);
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({ onReset: () => setPage(1) });
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

    const handleInputChange = (ev: any) => {
        setPage(1);
        setSearch(ev.target.value);
    };

    const handleValueChange = (value: ApiProviderType | null) => {
        if (value === null) return;
        reset();
        setSelectDrop(value);
    };

    return (
        <div ref={containerRef}>
            <div className={cn("flex items-center bg-background border rounded-lg transition-all duration-200 overflow-hidden",
                "focus-within:ring-2 focus-within:ring-brand/50 focus-within:border-brand",
                selectOpen ? "ring-2 ring-brand/50 border-brand" : "border"
            )}>
                <Select
                    value={selectDrop}
                    items={searchProviderItems}
                    onOpenChange={setSelectOpen}
                    onValueChange={handleValueChange}
                >
                    <SelectTrigger className="h-10 rounded-none w-30 border-y-0 border-l-0 border-r border-input bg-accent/50
                    focus:ring-0 focus:ring-offset-0">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {searchProviderItems.map((item) =>
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Input
                    value={search}
                    inputMode="search"
                    onChange={handleInputChange}
                    placeholder="Search for media/users..."
                    className="flex-1 border-none bg-background text-sm focus:outline-none focus:ring-0"
                />
                <div className="px-3 text-muted-foreground">
                    {isOpen
                        ? <X className="size-4 cursor-pointer" onClick={reset}/>
                        : <Search className="size-4"/>
                    }
                </div>
            </div>

            <SearchContainer
                error={error}
                search={search}
                isOpen={isOpen}
                isPending={isFetching}
                className="max-w-md -mt-2"
                debouncedSearch={debouncedSearch}
                hasResults={!!searchResults?.data.length}
            >
                <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-91">
                    {searchResults?.data.map((item) =>
                        <SearchComponent
                            item={item}
                            key={item.id}
                            resetSearch={reset}
                            setMobileMenu={setMobileMenu}
                        />
                    )}
                    {searchResults && searchResults.data.length > 0 &&
                        <div className="flex justify-end gap-2 items-center p-4">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                <ChevronLeft/>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!searchResults?.hasNextPage}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                <ChevronRight/>
                            </Button>
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
            <div key={item.id} className={cn("cursor-pointer p-3 hover:bg-popover/50", isLoadingItem && "cursor-auto")}>
                <div className="flex w-full gap-4 items-center">
                    <div className="relative shrink-0">
                        {item.itemType === ApiProviderType.USERS ?
                            <ProfileIcon
                                fallbackSize="text-lg"
                                className="size-14 border-2"
                                user={{ name: item.name, image: item.image }}
                            />
                            :
                            <img
                                loading="lazy"
                                alt={item.name}
                                src={item.image}
                                className={cn("w-16 aspect-2/3 rounded-sm transition-opacity duration-200", isLoadingItem && "opacity-20")}
                            />
                        }
                        {isLoadingItem &&
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner className="size-8"/>
                            </div>
                        }
                    </div>
                    <div className={cn("flex-1 min-w-0 transition-opacity duration-200", isLoadingItem && "opacity-40")}>
                        <div className="font-semibold mb-2 line-clamp-2">
                            {item.name}
                        </div>
                        <div className="text-foreground capitalize">
                            {item.itemType}
                        </div>
                        <div className="text-muted-foreground text-sm">
                            {formatDate(item.date)}
                        </div>
                    </div>
                </div>
            </div>
            <Separator className="m-0"/>
        </Link>
    );
};
