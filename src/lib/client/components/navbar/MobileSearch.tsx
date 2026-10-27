import {useRef, useState} from "react";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {capitalize} from "@/lib/utils/formatting/text";
import {SheetClose} from "@/lib/client/components/ui/sheet";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {displayContainerError} from "@/lib/client/error-display";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {navSearchOptions} from "@/lib/client/react-query/query-options";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {ApiProviderType, MediaType, PrivacyType} from "@/lib/utils/enums";
import {getAdvancedSearchConfig} from "@/lib/client/components/media/media-config";
import {MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {SearchMediaListIndicator} from "@/lib/client/components/media/base/SearchMediaListIndicator";
import {ArrowRight, ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal} from "lucide-react";
import {getSearchProviderItems, getSearchResultLink} from "@/lib/client/components/navbar/navbar-search";


export const MobileSearch = () => {
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const categories = getSearchProviderItems(currentUser?.settings);
    const [provider, setProvider] = useState<ApiProviderType>(currentUser?.searchSelector ?? ApiProviderType.TMDB);

    const query = search.trim();
    const debouncedSearch = useDebounce(query, 400);
    const searchOptions = navSearchOptions(debouncedSearch, page, provider);
    const { data, isPending, isFetching, error } = useQuery({ ...searchOptions, enabled: searchOptions.enabled && query === debouncedSearch });

    const waiting = isPending || query !== debouncedSearch;
    const hasResults = !!data?.data.length;
    const showPagination = query.length >= 2 && !waiting && !error && (hasResults || page > 1);
    const destination = { page: 1, query, apiProvider: provider, advancedFilters: undefined };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b bg-background pt-[env(safe-area-inset-top)]">
                <div className="flex items-center gap-2 px-4 py-3">
                    <form
                        className="min-w-0 flex-1"
                        onSubmit={(event) => {
                            event.preventDefault();
                            inputRef.current?.blur();
                        }}
                    >
                        <SearchInput
                            autoFocus
                            ref={inputRef}
                            value={search}
                            enterKeyHint="done"
                            aria-label="Search for media or users"
                            placeholder="What are you looking for?"
                            className="h-12 rounded-xl border-0 bg-muted/60"
                            inputClassName="text-base md:text-base [&::-webkit-search-cancel-button]:hidden"
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </form>
                    <SheetClose className="min-h-11 px-1 text-sm font-medium text-brand">
                        Cancel
                    </SheetClose>
                </div>

                <div className="overflow-x-auto px-4 pb-3 scrollbar-thin">
                    <ToggleGroup
                        value={[provider]}
                        className="min-w-full"
                        aria-label="Search media type"
                        onValueChange={(values) => {
                            if (!values.length) return;
                            setProvider(values[0] as ApiProviderType);
                            setPage(1);
                        }}
                    >
                        {categories.map(({ label, value, icon: Icon }) =>
                            <ToggleGroupItem
                                key={value}
                                value={value}
                                className="h-16 min-w-18 flex-1 flex-col gap-1 rounded-xl px-3 text-xs text-muted-foreground
                                aria-pressed:bg-brand/10 aria-pressed:text-brand"
                            >
                                <Icon className="size-5"/>
                                {label}
                            </ToggleGroupItem>
                        )}
                    </ToggleGroup>
                </div>
            </div>

            <div
                ref={resultsRef}
                aria-busy={query.length >= 2 && (waiting || isFetching)}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
            >
                <div className="flex min-h-14 items-center justify-between gap-3 py-3">
                    <p className="text-sm font-medium text-muted-foreground">
                        {query.length >= 2 ? `Results for “${query}”` : "Find your next favorite"}
                    </p>
                    {getAdvancedSearchConfig(provider) &&
                        <Link
                            replace
                            to="/search"
                            search={destination}
                            className={buttonVariants({ variant: "ghost", className: "h-11 shrink-0 text-brand" })}
                        >
                            <SlidersHorizontal data-icon="inline-start"/>
                            Advanced search
                        </Link>
                    }
                </div>

                {query.length < 2 ?
                    <EmptyState
                        icon={Search}
                        className="py-16"
                        message="Pick a category above, then type at least two characters to start exploring."
                    />
                    : waiting ?
                        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                            <Spinner/> Searching…
                        </div>
                        : error ?
                            <p role="alert" className="py-10 text-center text-sm text-destructive">
                                {displayContainerError({ error })}
                            </p>
                            : !data?.data.length ?
                                <EmptyState
                                    icon={SearchX}
                                    className="py-16"
                                    message={`No results for “${query}”. Try another title or category.`}
                                />
                                :
                                <ul className="divide-y">
                                    {data.data.map((item) => {
                                        const isUser = item.itemType === ApiProviderType.USERS;

                                        return (
                                            <li key={`${item.itemType}-${item.id}`}>
                                                <Link
                                                    replace
                                                    {...getSearchResultLink(item)}
                                                    className="flex items-center gap-4 rounded-lg py-4 outline-none focus-visible:ring-3
                                                    focus-visible:ring-ring/50 active:bg-muted/50"
                                                >
                                                    {isUser ?
                                                        <ProfileIcon
                                                            fallbackSize="text-lg"
                                                            className="size-14 shrink-0"
                                                            user={{ name: item.name, image: item.image }}
                                                        />
                                                        :
                                                        <img
                                                            alt=""
                                                            loading="lazy"
                                                            src={item.image}
                                                            className="aspect-2/3 w-20 shrink-0 rounded-lg bg-muted object-cover"
                                                        />
                                                    }
                                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                        <span className="line-clamp-3 text-base font-semibold leading-snug">
                                                            {item.name}
                                                        </span>
                                                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                                            {isUser ?
                                                                `${capitalize(item.privacy ?? PrivacyType.RESTRICTED)} profile`
                                                                : <>
                                                                    <MediaTypeText mediaType={item.itemType as MediaType}/>
                                                                    <MediaReleaseDate date={item.date} precision="year"/>
                                                                </>
                                                            }
                                                        </span>
                                                        {item.inCurrentUserList &&
                                                            <SearchMediaListIndicator
                                                                mediaName={item.name}
                                                                presentation="inline"
                                                            />
                                                        }
                                                        {isUser && currentUser?.id === Number(item.id) &&
                                                            <span className="text-sm text-brand">
                                                                Your profile
                                                            </span>
                                                        }
                                                    </div>
                                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true"/>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                }

                {currentUser && provider === ApiProviderType.BOOKS && query.length >= 2 && !waiting && !error &&
                    <Link
                        replace
                        to="/add-book"
                        search={{ title: query }}
                        className="my-4 flex min-h-12 items-center justify-between rounded-xl bg-muted/50 px-4 text-sm font-medium"
                    >
                        Add a book manually <ArrowRight className="size-4"/>
                    </Link>
                }
            </div>

            {showPagination &&
                <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
                    <Button
                        className="h-11"
                        variant="outline"
                        disabled={page === 1 || isFetching}
                        aria-label="Previous search result page"
                        onClick={() => {
                            setPage(page - 1);
                            resultsRef.current?.scrollTo({ top: 0 });
                        }}
                    >
                        <ChevronLeft data-icon="inline-start"/> Previous
                    </Button>

                    <span className="text-sm text-muted-foreground">
                        Page {page}
                    </span>

                    <Button
                        className="h-11"
                        variant="outline"
                        aria-label="Next search result page"
                        disabled={!data?.hasNextPage || isFetching}
                        onClick={() => {
                            setPage(page + 1);
                            resultsRef.current?.scrollTo({ top: 0 });
                        }}
                    >
                        Next<ChevronRight data-icon="inline-end"/>
                    </Button>
                </div>
            }
        </div>
    );
};
