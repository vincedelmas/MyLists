import {UpdateType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {getThemeColor} from "@/lib/client/theme";
import {formatRating} from "@/lib/client/ratings";
import {useEffect, useRef, useState} from "react";
import {useNavigate} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {captureEvent} from "@/lib/client/analytics";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {getSearchProviderItems} from "@/lib/client/components/navbar/navbar-search";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {commandPaletteOptions, continueOptions} from "@/lib/client/react-query/query-options";
import {ArrowUpRight, Command as CommandIcon, Heart, ListFilter, ListOrdered} from "lucide-react";
import {getCommandPaletteNavItems, matchesPaletteTokens, type PaletteNavItem} from "@/lib/client/components/navbar/command-palette-items";
import {Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator} from "@/lib/client/components/ui/command";


const DOUBLE_SHIFT_WINDOW_MS = 350;


const isMacPlatform = () => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
};


export const CommandPalette = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const currentDate = useCurrentDate();
    const isJumping = useRef(false);
    const isOpenRef = useRef(false);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [shortcutLabel] = useState(() => (isMacPlatform() ? "⌘K" : "Ctrl K"));

    const trimmedQuery = query.trim();
    const debouncedQuery = useDebounce(trimmedQuery, 150);
    const { data: paletteData, isFetching, isError } = useQuery(commandPaletteOptions(debouncedQuery, open && Boolean(currentUser)));

    const { data: continueData } = useQuery({
        ...continueOptions(currentUser?.name ?? "", { preview: true }),
        enabled: open && Boolean(currentUser) && trimmedQuery.length === 0,
    });

    const setPaletteOpen = (nextOpen: boolean, trigger?: "button" | "shortcut_k" | "double_shift") => {
        if (nextOpen && !isOpenRef.current && trigger) {
            captureEvent("command_palette_opened", { trigger });
        }
        if (nextOpen) isJumping.current = false;
        isOpenRef.current = nextOpen;
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
    };

    useEffect(() => {
        let lastShiftTapAt = 0;
        let shiftPressedAlone = false;

        const resetShiftTap = () => {
            lastShiftTapAt = 0;
            shiftPressedAlone = false;
        };

        const togglePalette = (trigger: "shortcut_k" | "double_shift") => {
            const nextOpen = !isOpenRef.current;
            if (nextOpen) {
                captureEvent("command_palette_opened", { trigger });
                isJumping.current = false;
            }
            else {
                setQuery("");
            }
            isOpenRef.current = nextOpen;
            setOpen(nextOpen);
        };

        const handleKeyDown = (ev: KeyboardEvent) => {
            if (ev.defaultPrevented) {
                resetShiftTap();
                return;
            }

            if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
                ev.preventDefault();
                resetShiftTap();
                togglePalette("shortcut_k");
                return;
            }

            if (ev.key === "Shift") {
                if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) resetShiftTap();
                else shiftPressedAlone = true;
                return;
            }

            resetShiftTap();
        };

        const handleKeyUp = (ev: KeyboardEvent) => {
            if (ev.key !== "Shift" || !shiftPressedAlone) return;

            const now = Date.now();
            shiftPressedAlone = false;

            if (now - lastShiftTapAt <= DOUBLE_SHIFT_WINDOW_MS) {
                lastShiftTapAt = 0;
                togglePalette("double_shift");
            }
            else {
                lastShiftTapAt = now;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", resetShiftTap);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", resetShiftTap);
        };
    }, []);

    const handleOpenChange = (nextOpen: boolean) => {
        setPaletteOpen(nextOpen);
    };

    const runAction = (
        resultType: "continue" | "media" | "collection" | "dynamic_list" | "follow" | "page" | "external_search",
        action: () => void,
    ) => {
        captureEvent("command_palette_selected", {
            result_type: resultType,
            had_query: trimmedQuery.length > 0,
        });
        isJumping.current = true;
        isOpenRef.current = false;
        setOpen(false);
        setQuery("");
        action();
    };

    const runPageAction = (action: () => void) => runAction("page", action);

    const navItems = getCommandPaletteNavItems({ navigate, currentUser, currentDate });

    const continueItems = (continueData?.items ?? []).filter(item =>
        getMediaDefinition(item.mediaType).continue.getUpdate(item)?.type !== UpdateType.STATUS,
    ).slice(0, 5);

    const isSearching = trimmedQuery.length > 0;
    const isServerReady = Boolean(currentUser) && debouncedQuery.length >= 2;

    const isServerSearchActive = Boolean(currentUser) && trimmedQuery.length >= 2;
    const isWaitingForServer = isServerSearchActive && (trimmedQuery !== debouncedQuery || isFetching);

    const mediaResults = isServerReady ? (paletteData?.media ?? []) : [];
    const collectionResults = isServerReady ? (paletteData?.collections ?? []) : [];

    const followResults = isServerReady ? (paletteData?.follows ?? []) : [];
    const dynamicListResults = isServerReady ? (paletteData?.dynamicLists ?? []) : [];

    const filteredNavItems = isSearching
        ? navItems.filter(item => matchesPaletteTokens(trimmedQuery, item.label, item.keywords)).slice(0, 10)
        : [];

    const searchProviders = currentUser ? getSearchProviderItems(currentUser.settings) : [];
    const showExternalSearch = Boolean(currentUser) && trimmedQuery.length >= 2 && searchProviders.length > 0;

    const hasLocalSearchResults = mediaResults.length > 0
        || collectionResults.length > 0
        || dynamicListResults.length > 0
        || followResults.length > 0
        || filteredNavItems.length > 0;

    return (
        <>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="hover"
                            className="mr-1"
                            onClick={() => setPaletteOpen(true, "button")}
                            aria-label={`Quick Jump (${shortcutLabel} or double Shift)`}
                        />
                    }
                >
                    <CommandIcon className="size-4.5" aria-hidden="true"/>
                </TooltipTrigger>
                <TooltipContent side="bottom" variant="popover">
                    <span>Quick jump</span>
                    <kbd data-slot="kbd" className="bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
                        {shortcutLabel}
                    </kbd>
                    <kbd data-slot="kbd" className="bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
                        2× Shift
                    </kbd>
                </TooltipContent>
            </Tooltip>

            <CommandDialog open={open} onOpenChange={handleOpenChange} finalFocus={() => !isJumping.current}>
                <Command loop shouldFilter={false}>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder={currentUser ? "Search your lists, collections, pages..." : "Jump to a page..."}
                        endAddon={isWaitingForServer
                            ? <Spinner className="size-3.5 text-muted-foreground"/>
                            : undefined
                        }
                    />

                    <CommandList>
                        {!isSearching ?
                            <>
                                {continueItems.length > 0 &&
                                    <>
                                        <CommandGroup heading="Continue">
                                            {continueItems.map(item => {
                                                const progress = getMediaConfig(item.mediaType).continue.getProgress(item);

                                                return (
                                                    <CommandItem
                                                        key={`continue-${item.mediaType}-${item.mediaId}`}
                                                        value={`continue-${item.mediaType}-${item.mediaId}`}
                                                        onSelect={() => runAction("continue", () => void navigate({
                                                            to: "/details/$mediaType/$mediaId",
                                                            params: { mediaType: item.mediaType, mediaId: item.mediaId },
                                                        }))}
                                                    >
                                                        <img
                                                            alt=""
                                                            src={item.imageCover}
                                                            className="h-9 w-6 shrink-0 rounded-sm object-cover"
                                                        />
                                                        <div className="flex min-w-0 flex-1 flex-col">
                                                            <span className="truncate font-medium">
                                                                {item.mediaName}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <MediaTypeIcon mediaType={item.mediaType} size={12}/>
                                                                <span className="truncate tabular-nums">
                                                                    {progress.label}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                        <CommandSeparator/>
                                    </>
                                }

                                <CommandGroup heading={currentUser ? "Quick Actions" : "Explore"}>
                                    {navItems
                                        .filter(item => item.section === "quick" || (!currentUser && item.section === "pages"))
                                        .slice(0, 6).map(item =>
                                            <NavCommandItem
                                                item={item}
                                                key={item.id}
                                                onRun={runPageAction}
                                            />
                                        )
                                    }
                                </CommandGroup>

                                {currentUser &&
                                    <>
                                        <CommandSeparator/>
                                        <CommandGroup heading="Tracking Lists">
                                            {navItems
                                                .filter(item => item.section === "lists")
                                                .map(item =>
                                                    <NavCommandItem
                                                        item={item}
                                                        key={item.id}
                                                        onRun={runPageAction}
                                                    />
                                                )
                                            }
                                        </CommandGroup>
                                    </>
                                }
                            </>
                            :
                            <>
                                {mediaResults.length > 0 &&
                                    <CommandGroup heading="In Your Lists">
                                        {mediaResults.map(item => {
                                            const ratingDisplay = currentUser && item.rating !== null
                                                ? formatRating(currentUser.ratingSystem, item.rating, true)
                                                : null;

                                            return (
                                                <CommandItem
                                                    key={`media-${item.mediaType}-${item.mediaId}`}
                                                    value={`media-${item.mediaType}-${item.mediaId}`}
                                                    onSelect={() => runAction("media", () => void navigate({
                                                        to: "/details/$mediaType/$mediaId",
                                                        params: { mediaType: item.mediaType, mediaId: item.mediaId },
                                                    }))}
                                                >
                                                    <img
                                                        alt=""
                                                        src={item.imageCover}
                                                        className="h-9 w-6 shrink-0 rounded-sm object-cover"
                                                    />
                                                    <div className="flex min-w-0 flex-1 flex-col">
                                                        <span className="truncate font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <MediaTypeIcon mediaType={item.mediaType} size={12}/>
                                                            <span
                                                                aria-hidden="true"
                                                                className="size-1.5 shrink-0 rounded-full"
                                                                style={{ backgroundColor: getThemeColor(item.status) }}
                                                            />
                                                            <span className="truncate">
                                                                {item.status}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="ml-auto flex shrink-0 items-center gap-2 text-xs
                                                    text-muted-foreground tabular-nums">
                                                        {item.favorite &&
                                                            <Heart
                                                                aria-label="Favorite"
                                                                className="size-3.5 fill-favorite text-favorite"
                                                            />
                                                        }
                                                        {ratingDisplay !== null &&
                                                            <span className="font-medium text-rating">
                                                                {ratingDisplay}
                                                            </span>
                                                        }
                                                    </div>
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                }

                                {collectionResults.length > 0 &&
                                    <CommandGroup heading="Collections">
                                        {collectionResults.map(collection =>
                                            <CommandItem
                                                key={`collection-${collection.id}`}
                                                value={`collection-${collection.id}`}
                                                onSelect={() => runAction("collection", () => void navigate({
                                                    to: "/lists/collections/$collectionId",
                                                    params: { collectionId: collection.id },
                                                }))}
                                            >
                                                <ListOrdered className="size-4 text-muted-foreground"/>
                                                <span className="min-w-0 flex-1 truncate">
                                                    {collection.title}
                                                </span>
                                                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                                                    {collection.itemsCount}{" "}
                                                    {collection.itemsCount === 1 ? "item" : "items"}
                                                </span>
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                }

                                {dynamicListResults.length > 0 &&
                                    <CommandGroup heading="Dynamic Lists">
                                        {dynamicListResults.map(list =>
                                            <CommandItem
                                                key={`dynamic-${list.id}`}
                                                value={`dynamic-${list.id}`}
                                                onSelect={() => runAction("dynamic_list", () => void navigate({
                                                    to: "/lists/dynamic/$listId",
                                                    params: { listId: list.id },
                                                }))}
                                            >
                                                <ListFilter className="size-4 text-muted-foreground"/>
                                                <span className="min-w-0 flex-1 truncate">
                                                    {list.title}
                                                </span>
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                }

                                {followResults.length > 0 &&
                                    <CommandGroup heading="Following">
                                        {followResults.map(person => (
                                            <CommandItem
                                                key={`follow-${person.id}`}
                                                value={`follow-${person.id}`}
                                                onSelect={() => runAction("follow", () => void navigate({
                                                    to: "/profile/$username",
                                                    params: { username: person.name },
                                                }))}
                                            >
                                                <ProfileIcon
                                                    fallbackSize="text-[10px]"
                                                    className="size-6 border-none"
                                                    user={{ name: person.name, image: person.image ?? "" }}
                                                />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {person.name}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                }

                                {filteredNavItems.length > 0 &&
                                    <CommandGroup heading="Pages & Actions">
                                        {filteredNavItems.map(item =>
                                            <NavCommandItem
                                                item={item}
                                                key={item.id}
                                                onRun={runPageAction}
                                            />
                                        )}
                                    </CommandGroup>
                                }

                                {!hasLocalSearchResults &&
                                    <div className="py-5 text-center text-sm text-muted-foreground">
                                        {isWaitingForServer
                                            ? "Searching your lists..."
                                            : isError && isServerReady
                                                ? "Could not search your lists right now."
                                                : currentUser && trimmedQuery.length === 1
                                                    ? "No matching pages. Type at least 2 characters to search your lists."
                                                    : showExternalSearch
                                                        ? "No matches in your lists."
                                                        : "No results found."
                                        }
                                    </div>
                                }

                                {showExternalSearch &&
                                    <>
                                        {hasLocalSearchResults && <CommandSeparator/>}
                                        <CommandGroup heading="Search External">
                                            {searchProviders.map(provider => {
                                                const Icon = provider.icon;

                                                return (
                                                    <CommandItem
                                                        key={`external-${provider.value}`}
                                                        value={`external-${provider.value}`}
                                                        onSelect={() => runAction("external_search", () => void navigate({
                                                            to: "/search",
                                                            search: {
                                                                page: 1,
                                                                query: trimmedQuery,
                                                                advancedFilters: undefined,
                                                                apiProvider: provider.value,
                                                            },
                                                        }))}
                                                    >
                                                        <Icon className="size-4 text-muted-foreground"/>
                                                        <span className="min-w-0 flex-1 truncate">
                                                            Search {provider.label} for “{trimmedQuery}”
                                                        </span>
                                                        <ArrowUpRight
                                                            aria-hidden="true"
                                                            className="ml-auto size-3.5 text-muted-foreground"
                                                        />
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </>
                                }
                            </>
                        }
                    </CommandList>

                    <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground max-sm:hidden">
                        <div className="flex items-center gap-3">
                            <span><kbd className="font-mono">
                                ↑↓</kbd> Navigate
                            </span>
                            <span><kbd className="font-mono">
                                ↵</kbd> Open
                            </span>
                            <span><kbd className="font-mono">
                                Esc</kbd> Close
                            </span>
                        </div>
                        <span>
                            {currentUser
                                ? "Your lists & pages"
                                : "Pages"
                            }
                        </span>
                    </div>
                </Command>
            </CommandDialog>
        </>
    );
};


const NavCommandItem = ({ item, onRun }: { item: PaletteNavItem; onRun: (action: () => void) => void }) => {
    const Icon = item.icon;

    return (
        <CommandItem value={item.id} onSelect={() => onRun(item.onSelect)}>
            {item.mediaType
                ? <MediaTypeIcon mediaType={item.mediaType} size={15}/>
                : Icon && <Icon className="size-4 text-muted-foreground"/>
            }
            <span className="min-w-0 flex-1 truncate">
                {item.label}
            </span>
        </CommandItem>
    );
};
