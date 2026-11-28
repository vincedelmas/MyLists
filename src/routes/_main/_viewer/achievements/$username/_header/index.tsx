import {cn} from "@/lib/utils/classnames";
import {useEffect, useRef, useState} from "react";
import {AchievementCategory} from "@/lib/utils/enums";
import {Label} from "@/lib/client/components/ui/label";
import {useSuspenseQuery} from "@tanstack/react-query";
import {AchCard} from "@/lib/types/query.options.types";
import {achievementTabSearchSchema} from "@/lib/schemas";
import {Switch} from "@/lib/client/components/ui/switch";
import {formatNumber} from "@/lib/utils/formatting/number";
import {Progress} from "@/lib/client/components/ui/progress";
import {createFileRoute, useLocation} from "@tanstack/react-router";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {achievementOptions} from "@/lib/client/react-query/query-options";
import {PROFILE_MAX_PINNED_ACHIEVEMENTS} from "@/lib/types/profile-custom.types";
import {AchievementCard} from "@/lib/client/components/achievements/AchievementCard";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {AchievementSummary} from "@/lib/client/components/achievements/AchievementSummary";
import {toggleAchievementSoundMuted, useAchievementSoundMuted} from "@/lib/client/achievements/achievement-toasts";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {useReorderPinnedAchievementsMutation, useTogglePinnedAchievementMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {
    ACHIEVEMENT_CATEGORY_LABELS,
    formatAchievementRemaining,
    getRaritySortValue,
    isMediaAchievementCategory,
    isRareAchievement,
    NON_MEDIA_ACHIEVEMENT_CATEGORIES,
} from "@/lib/utils/achievements";
import {
    Award,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    Compass,
    Eye,
    EyeOff,
    Gamepad2,
    LayoutGrid,
    Lock,
    Pin,
    Target,
    Trophy,
    Users,
    Volume2,
    VolumeX,
} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";


type CategoryFilter = "all" | AchievementCategory;
type StatusFilter = "all" | "unlocked" | "locked" | "rare" | "pinned";
type SortMode = "default" | "closest" | "rarest" | "recent" | "common";


const PAGE_SIZE = 24;


const ALL_SORT_ITEMS: Record<SortMode, { value: SortMode; label: string }> = {
    default: { value: "default", label: "Default" },
    closest: { value: "closest", label: "Closest to unlock" },
    rarest: { value: "rarest", label: "Rarest first" },
    recent: { value: "recent", label: "Recently unlocked" },
    common: { value: "common", label: "Most common" },
};


const SORT_MODES_BY_STATUS: Record<StatusFilter, readonly SortMode[]> = {
    all: ["default", "closest", "rarest", "recent", "common"],
    unlocked: ["recent", "rarest", "common", "default"],
    locked: ["closest", "default", "rarest", "common"],
    rare: ["rarest", "recent", "closest", "default"],
    pinned: ["default", "rarest", "recent", "common"],
};


export const Route = createFileRoute("/_main/_viewer/achievements/$username/_header/")({
    validateSearch: achievementTabSearchSchema,
    context: ({ params: { username } }) => ({
        achievementQueryOptions: achievementOptions(username),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.achievementQueryOptions, staleTime: "static" });
    },
    component: AchievementPage,
});


function getCategoryIcon(category: CategoryFilter) {
    if (category === "all") return <LayoutGrid className="size-3.5 text-muted-foreground"/>;
    if (isMediaAchievementCategory(category)) return <MainThemeIcon type={category} size={15}/>;
    if (category === AchievementCategory.GENERAL) return <Compass className="size-3.5 text-brand"/>;
    if (category === AchievementCategory.MINIGAMES) return <Gamepad2 className="size-3.5 text-series"/>;
    if (category === AchievementCategory.COMMUNITY) return <Users className="size-3.5 text-info"/>;

    return <Lock className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400"/>;
}


function sortAchievements(list: AchCard[], sortMode: SortMode, pinnedIndex?: Map<string, number>) {
    return [...list].sort((a, b) => {
        if (sortMode === "default" && pinnedIndex) {
            return (pinnedIndex.get(a.codeName) ?? Number.MAX_SAFE_INTEGER) - (pinnedIndex.get(b.codeName) ?? Number.MAX_SAFE_INTEGER);
        }

        if (sortMode === "closest") {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return b.progress - a.progress || getRaritySortValue(a.rarity) - getRaritySortValue(b.rarity);
        }

        if (sortMode === "rarest") {
            return getRaritySortValue(a.rarity) - getRaritySortValue(b.rarity) || a.sortOrder - b.sortOrder;
        }

        if (sortMode === "common") {
            return (b.rarity ?? -1) - (a.rarity ?? -1) || a.sortOrder - b.sortOrder;
        }

        if (sortMode === "recent") {
            if (a.completed !== b.completed) return a.completed ? -1 : 1;
            return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
        }

        if (a.completed !== b.completed) return a.completed ? -1 : 1;

        return a.sortOrder - b.sortOrder;
    });
}


function buildOrderedAchievements(params: {
    search: string;
    items: AchCard[];
    sortMode: SortMode;
    pinnedCodeNames: string[];
    category: CategoryFilter;
    revealAllSecrets: boolean;
    statusFilter: StatusFilter;
    availableCategories: AchievementCategory[];
}) {
    const { items, availableCategories, pinnedCodeNames, category, statusFilter, sortMode, search, revealAllSecrets } = params;
    const pinnedSet = new Set(pinnedCodeNames);
    const pinnedIndex = statusFilter === "pinned"
        ? new Map(pinnedCodeNames.map((code, index) => [code, index]))
        : undefined;

    const query = search.trim().toLowerCase();
    const categoryItems = items.filter((item) => category === "all" || item.category === category);

    const filteredItems = categoryItems.filter((item) => {
        if (statusFilter === "unlocked" && !item.completed) return false;
        if (statusFilter === "locked" && item.completed) return false;
        if (statusFilter === "rare" && !isRareAchievement(item.rarity)) return false;
        if (statusFilter === "pinned" && !pinnedSet.has(item.codeName)) return false;

        if (!query) return true;
        const searchable = item.secret && !item.completed && !revealAllSecrets
            ? `hidden secret ${ACHIEVEMENT_CATEGORY_LABELS[item.category]}`
            : `${item.name} ${item.description} ${item.metadata?.label ?? ""} ${ACHIEVEMENT_CATEGORY_LABELS[item.category]}`;

        return searchable.toLowerCase().includes(query);
    });

    const shouldGroupByCategory = category === "all" && sortMode === "default" && !query && statusFilter !== "pinned";

    if (shouldGroupByCategory) {
        const nonSecret = availableCategories
            .filter((cat) => cat !== AchievementCategory.SECRETS)
            .flatMap((cat) => sortAchievements(filteredItems.filter((item) => item.category === cat), sortMode));

        const secrets = sortAchievements(filteredItems.filter((item) => item.category === AchievementCategory.SECRETS), sortMode);

        return {
            shouldGroupByCategory: true,
            shouldSplitHiddenFlat: false,
            orderedItems: [...nonSecret, ...secrets],
        };
    }

    const sorted = sortAchievements(filteredItems, sortMode, pinnedIndex);
    const shouldSplitHiddenFlat = sortMode === "default" && statusFilter !== "unlocked" && statusFilter !== "pinned";

    if (!shouldSplitHiddenFlat) {
        return {
            orderedItems: sorted,
            shouldGroupByCategory: false,
            shouldSplitHiddenFlat: false,
        };
    }

    const mainItems = sorted.filter((item) => !item.secret || item.completed);
    const hiddenItems = sorted.filter((item) => item.secret && !item.completed);

    return {
        shouldSplitHiddenFlat: true,
        shouldGroupByCategory: false,
        orderedItems: [...mainItems, ...hiddenItems],
    };
}


function AchievementPage() {
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const { activeTab } = Route.useSearch();
    const { achievementQueryOptions } = Route.useRouteContext();
    const togglePin = useTogglePinnedAchievementMutation(username);
    const reorderPins = useReorderPinnedAchievementsMutation(username);
    const soundMuted = useAchievementSoundMuted();
    const apiData = useSuspenseQuery(achievementQueryOptions).data;
    const locationHash = useLocation({ select: (loc) => loc.hash });

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortMode, setSortMode] = useState<SortMode>("default");
    const [compareMode, setCompareMode] = useState(false);
    const [revealAllSecrets, setRevealAllSecrets] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<AchievementCategory>>(() => new Set());
    const [highlight, setHighlight] = useState<{ code: string; seq: number } | null>(null);
    const pendingScrollCodeRef = useRef<string | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);

    const perfectSet = new Set(apiData.summary.perfectCategories);
    const pinnedSet = new Set(apiData.pinnedCodeNames);
    const canCompare = apiData.items.some((item) => item.viewerProgress !== null);
    const pinMutationPending = togglePin.isPending || reorderPins.isPending;

    const availableCategories: AchievementCategory[] = [
        ...apiData.userActivatedMediaTypes,
        ...NON_MEDIA_ACHIEVEMENT_CATEGORIES,
    ];

    const currentCategory: CategoryFilter = activeTab !== "all" && availableCategories.includes(activeTab)
        ? activeTab
        : "all";

    const allowedSortModes = SORT_MODES_BY_STATUS[statusFilter];
    const effectiveSortMode: SortMode = allowedSortModes.includes(sortMode) ? sortMode : allowedSortModes[0];
    const sortItems = allowedSortModes.map((mode) => ALL_SORT_ITEMS[mode]);

    const { orderedItems, shouldGroupByCategory, shouldSplitHiddenFlat } = buildOrderedAchievements({
        items: apiData.items,
        availableCategories,
        pinnedCodeNames: apiData.pinnedCodeNames,
        category: currentCategory,
        statusFilter,
        sortMode: effectiveSortMode,
        search,
        revealAllSecrets,
    });

    const totalPages = shouldGroupByCategory ? 1 : Math.max(1, Math.ceil(orderedItems.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = shouldGroupByCategory
        ? orderedItems
        : orderedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const latestNavContextRef = useRef({
        items: apiData.items,
        availableCategories,
        pinnedCodeNames: apiData.pinnedCodeNames,
        currentCategory,
        statusFilter,
        effectiveSortMode,
        search,
        revealAllSecrets,
    });
    latestNavContextRef.current = {
        items: apiData.items,
        availableCategories,
        pinnedCodeNames: apiData.pinnedCodeNames,
        currentCategory,
        statusFilter,
        effectiveSortMode,
        search,
        revealAllSecrets,
    };

    // Handle hash navigation (e.g. from Profile Showcase or Live Unlock Toast)
    useEffect(() => {
        const cleanHash = locationHash.replace(/^#/, "");
        if (!cleanHash.startsWith("ach-")) return;
        const codeName = cleanHash.slice(4);
        const frame = requestAnimationFrame(() => {
            const el = document.getElementById(`ach-${codeName}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlight((prev) => ({ code: codeName, seq: (prev?.seq ?? 0) + 1 }));
                return;
            }

            const ctx = latestNavContextRef.current;
            const target = ctx.items.find((item) => item.codeName === codeName);
            if (!target) return;

            setCollapsedCategories((prev) => {
                if (!prev.has(target.category)) return prev;
                const next = new Set(prev);
                next.delete(target.category);
                return next;
            });
            if (ctx.search) setSearch("");
            if (ctx.statusFilter !== "all") setStatusFilter("all");

            const nextOrdered = buildOrderedAchievements({
                items: ctx.items,
                availableCategories: ctx.availableCategories,
                pinnedCodeNames: ctx.pinnedCodeNames,
                category: ctx.currentCategory,
                statusFilter: "all",
                sortMode: ctx.effectiveSortMode,
                search: "",
                revealAllSecrets: ctx.revealAllSecrets,
            });
            const idx = nextOrdered.orderedItems.findIndex((item) => item.codeName === codeName);
            setPage(nextOrdered.shouldGroupByCategory || idx < 0 ? 1 : Math.floor(idx / PAGE_SIZE) + 1);

            pendingScrollCodeRef.current = codeName;
            setHighlight((prev) => ({ code: codeName, seq: (prev?.seq ?? 0) + 1 }));
        });
        return () => cancelAnimationFrame(frame);
    }, [locationHash]);

    // Scroll to target achievement once filter/category/page updates have rendered it
    useEffect(() => {
        const targetCode = pendingScrollCodeRef.current;
        if (!targetCode) return;
        const el = document.getElementById(`ach-${targetCode}`);
        if (!el) return;
        pendingScrollCodeRef.current = null;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [highlight, currentCategory, statusFilter, search, safePage, collapsedCategories]);

    // Clear temporary card highlight ring
    useEffect(() => {
        if (!highlight) return;
        const timer = setTimeout(() => setHighlight(null), 2200);
        return () => clearTimeout(timer);
    }, [highlight]);

    const setCategory = (next: CategoryFilter) => {
        setPage(1);
        void navigate({
            resetScroll: false,
            search: { activeTab: next === "all" ? undefined : next },
        });
    };

    const handleStatusChange = (nextStatus: StatusFilter) => {
        setStatusFilter(nextStatus);
        setPage(1);

        const nextAllowed = SORT_MODES_BY_STATUS[nextStatus];
        if (!nextAllowed.includes(sortMode)) {
            setSortMode(nextAllowed[0]);
        }

        // Pinned is a cross-category showcase: reset category to "all" so pinned items are never hidden
        if (nextStatus === "pinned" && currentCategory !== "all") {
            setCategory("all");
        }
    };

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage);
        toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleJumpToNextUp = (codeName: string, category: AchievementCategory) => {
        const nextStatus: StatusFilter = statusFilter === "unlocked" || statusFilter === "pinned" || statusFilter === "rare"
            ? "all"
            : statusFilter;
        const nextAllowedSort = SORT_MODES_BY_STATUS[nextStatus];
        const nextSort = nextAllowedSort.includes(effectiveSortMode) ? effectiveSortMode : nextAllowedSort[0];
        const nextCategory: CategoryFilter = currentCategory !== "all" && currentCategory !== category
            ? category
            : currentCategory;

        if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
        if (nextSort !== sortMode) setSortMode(nextSort);
        if (search) setSearch("");
        setCollapsedCategories((prev) => {
            if (!prev.has(category)) return prev;
            const next = new Set(prev);
            next.delete(category);
            return next;
        });
        if (nextCategory !== currentCategory) {
            void navigate({
                resetScroll: false,
                search: { activeTab: nextCategory === "all" ? undefined : nextCategory },
            });
        }

        const nextOrdered = buildOrderedAchievements({
            items: apiData.items,
            availableCategories,
            pinnedCodeNames: apiData.pinnedCodeNames,
            category: nextCategory,
            statusFilter: nextStatus,
            sortMode: nextSort,
            search: "",
            revealAllSecrets,
        });
        const idx = nextOrdered.orderedItems.findIndex((item) => item.codeName === codeName);
        setPage(nextOrdered.shouldGroupByCategory || idx < 0 ? 1 : Math.floor(idx / PAGE_SIZE) + 1);

        pendingScrollCodeRef.current = codeName;
        setHighlight((prev) => ({ code: codeName, seq: (prev?.seq ?? 0) + 1 }));
    };

    const handleMovePin = (codeName: string, direction: "prev" | "next") => {
        const currentIndex = apiData.pinnedCodeNames.indexOf(codeName);
        if (currentIndex < 0) return;

        const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= apiData.pinnedCodeNames.length) return;

        const nextOrder = [...apiData.pinnedCodeNames];
        [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
        reorderPins.mutate(nextOrder);
    };

    // Global Next Up strip (above the filter toolbar, never shifts or disappears when filtering)
    const globalNextUp = apiData.items
        .filter((item) => !item.completed && !item.secret && item.target > 1 && item.progress > 0)
        .sort((a, b) => b.progress - a.progress || (a.target - a.count) - (b.target - b.count))
        .slice(0, 3);

    const categoryStats = new Map(
        availableCategories.map((category) => {
            const allInCat = apiData.items.filter((item) => item.category === category);
            return [category, {
                unlocked: allInCat.filter((item) => item.completed).length,
                total: allInCat.length,
            }];
        }),
    );

    const statusOptions: { id: StatusFilter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "unlocked", label: "Unlocked" },
        { id: "locked", label: "Locked" },
        { id: "rare", label: "Rare" },
        ...(apiData.isOwner
            ? [{ id: "pinned" as const, label: `Pinned (${apiData.pinnedCodeNames.length}/${PROFILE_MAX_PINNED_ACHIEVEMENTS})` }]
            : []),
    ];

    const query = search.trim();
    const visibleHiddenLockedCount = orderedItems.filter((item) => item.secret && !item.completed).length;

    const groupedCategories = shouldGroupByCategory
        ? availableCategories
            .filter((category) => category !== AchievementCategory.SECRETS)
            .map((category) => {
                const stats = categoryStats.get(category) ?? { unlocked: 0, total: 0 };
                return {
                    category,
                    items: pageItems.filter((item) => item.category === category),
                    unlockedCount: stats.unlocked,
                    totalCount: stats.total,
                };
            })
            .filter((group) => group.items.length > 0)
        : [];

    const secretCategoryItems = shouldGroupByCategory
        ? pageItems.filter((item) => item.category === AchievementCategory.SECRETS)
        : [];
    const secretStats = categoryStats.get(AchievementCategory.SECRETS) ?? { unlocked: 0, total: 0 };

    const visibleGroupedCategoryKeys: AchievementCategory[] = shouldGroupByCategory
        ? [
            ...groupedCategories.map((group) => group.category),
            ...(secretCategoryItems.length > 0 ? [AchievementCategory.SECRETS] : []),
        ]
        : [];
    const allGroupsCollapsed = visibleGroupedCategoryKeys.length > 0
        && visibleGroupedCategoryKeys.every((cat) => collapsedCategories.has(cat));

    const toggleCategoryCollapsed = (category: AchievementCategory) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    };

    const toggleAllGroupsCollapsed = () => {
        setCollapsedCategories(allGroupsCollapsed ? new Set() : new Set(visibleGroupedCategoryKeys));
    };

    const flatMainItems = !shouldGroupByCategory && shouldSplitHiddenFlat
        ? pageItems.filter((item) => !item.secret || item.completed)
        : !shouldGroupByCategory
            ? pageItems
            : [];
    const flatHiddenItems = !shouldGroupByCategory && shouldSplitHiddenFlat
        ? pageItems.filter((item) => item.secret && !item.completed)
        : [];

    return (
        <div className="mb-12 flex flex-col pt-8">
            <PageHeader
                eyebrowIcon={Award}
                eyebrow="Trophy room"
                title={`${username}'s achievements`}
                asideValue={<QuickActions username={username}/>}
                description={apiData.isOwner
                    ? `Unlock trophies across media, minigames, and hidden secrets. Pin up to ${PROFILE_MAX_PINNED_ACHIEVEMENTS} 
                    to feature on your profile.`
                    : `Explore ${username}'s unlocked trophies, rarest badges, and category masteries.`
                }
            />

            <AchievementSummary
                summary={apiData.summary}
            />

            <nav aria-label="Achievement categories" className="mt-6">
                <div className="flex flex-wrap justify-center items-center gap-1.5 pb-3 max-w-3xl mx-auto max-sm:w-full">
                    <button
                        type="button"
                        aria-pressed={currentCategory === "all"}
                        onClick={() => setCategory("all")}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            currentCategory === "all"
                                ? "border-brand/50 bg-brand/12 text-foreground shadow-xs"
                                : "border-border/70 bg-card/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                        )}
                    >
                        {getCategoryIcon("all")}
                        <span>All</span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                            {formatNumber(apiData.summary.totalUnlocked)}/{formatNumber(apiData.summary.totalAvailable)}
                        </span>
                    </button>

                    {availableCategories.map((category) => {
                        const isPerfect = perfectSet.has(category);
                        const isActive = currentCategory === category;
                        const stats = categoryStats.get(category) ?? { unlocked: 0, total: 0 };

                        return (
                            <button
                                type="button"
                                key={category}
                                aria-pressed={isActive}
                                onClick={() => setCategory(category)}
                                className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs " +
                                    "font-medium transition-colors", isActive
                                    ? "border-brand/50 bg-brand/12 text-foreground shadow-xs"
                                    : "border-border/70 bg-card/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                                )}
                            >
                                {getCategoryIcon(category)}
                                <span>
                                    {ACHIEVEMENT_CATEGORY_LABELS[category]}
                                </span>
                                <span className={cn("inline-flex items-center gap-1 text-[11px] tabular-nums",
                                    isPerfect ? "font-semibold text-achievement" : "text-muted-foreground")}
                                >
                                    {isPerfect && <Check className="size-3"/>}
                                    {stats.unlocked}/{stats.total}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div ref={toolbarRef} className="mt-3 flex scroll-mt-18 flex-wrap items-center justify-between gap-3 border-b pb-4">
                <SearchInput
                    value={search}
                    placeholder="Search..."
                    className="w-100 max-sm:w-full"
                    aria-label="Search achievements"
                    onChange={(ev) => {
                        setSearch(ev.target.value);
                        setPage(1);
                    }}
                />

                <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted/45 p-0.5 border">
                        {statusOptions.map((option) =>
                            <button
                                type="button"
                                key={option.id}
                                onClick={() => handleStatusChange(option.id)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                    statusFilter === option.id
                                        ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {option.id === "pinned" && <Pin className="size-3"/>}
                                {option.label}
                            </button>
                        )}
                    </div>

                    <Select
                        items={sortItems}
                        value={effectiveSortMode}
                        onValueChange={(value) => {
                            if (value) {
                                setSortMode(value as SortMode);
                                setPage(1);
                            }
                        }}
                    >
                        <SelectTrigger aria-label="Sort achievements" className="w-42 max-sm:flex-1">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {sortItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    {canCompare &&
                        <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
                            <Switch
                                checked={compareMode}
                                id="compare-achievements"
                                onCheckedChange={setCompareMode}
                            />
                            <Label htmlFor="compare-achievements" className="cursor-pointer whitespace-nowrap text-xs">
                                Compare
                            </Label>
                        </div>
                    }

                    {visibleHiddenLockedCount > 0 &&
                        <Button variant="outline" onClick={() => setRevealAllSecrets((prev) => !prev)}>
                            {revealAllSecrets ? <EyeOff/> : <Eye/>}
                            {revealAllSecrets ? "Hide spoilers" : `Spoilers (${visibleHiddenLockedCount})`}
                        </Button>
                    }

                    {visibleGroupedCategoryKeys.length > 1 &&
                        <Button variant="outline" onClick={toggleAllGroupsCollapsed}>
                            {allGroupsCollapsed
                                ? <><ChevronsUpDown/> </>
                                : <><ChevronsDownUp/> </>
                            }
                        </Button>
                    }

                    {apiData.isOwner &&
                        <Button variant="outline" onClick={() => toggleAchievementSoundMuted()}>
                            {soundMuted
                                ? <><VolumeX/> </>
                                : <><Volume2/> </>
                            }
                        </Button>
                    }
                </div>
            </div>

            {orderedItems.length === 0 ? (
                <EmptyState
                    icon={Award}
                    className="mt-6 min-h-60 rounded-xl border"
                    message={
                        statusFilter === "pinned"
                            ? "You haven't pinned any achievements yet. Click the pin icon on an unlocked achievement to feature it on your profile."
                            : query
                                ? `No achievements match "${search}".`
                                : "No achievements in this view yet."
                    }
                />
            ) : shouldGroupByCategory ? (
                <div className="mt-6 space-y-8">
                    {groupedCategories.map((group) => {
                        const pct = group.totalCount > 0 ? (group.unlockedCount / group.totalCount) * 100 : 0;
                        const isPerfected = group.totalCount > 0 && group.unlockedCount === group.totalCount;
                        const isCollapsed = collapsedCategories.has(group.category);

                        return (
                            <section key={group.category} aria-label={`${ACHIEVEMENT_CATEGORY_LABELS[group.category]} achievements`}>
                                <button
                                    type="button"
                                    aria-expanded={!isCollapsed}
                                    onClick={() => toggleCategoryCollapsed(group.category)}
                                    className="group/cat-hdr mb-3.5 flex w-full flex-wrap items-center justify-between
                                     gap-3 rounded-lg py-1 text-left transition-colors hover:text-brand"
                                >
                                    <div className="flex items-center gap-2.5">
                                        {isCollapsed
                                            ? <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover/cat-hdr:text-foreground"/>
                                            : <ChevronDown className="size-4 text-muted-foreground transition-colors group-hover/cat-hdr:text-foreground"/>
                                        }
                                        {getCategoryIcon(group.category)}
                                        <span className="text-sm font-semibold tracking-tight text-foreground transition-colors
                                        group-hover/cat-hdr:text-brand">
                                            {ACHIEVEMENT_CATEGORY_LABELS[group.category]}
                                        </span>

                                        {isPerfected &&
                                            <span className="inline-flex items-center gap-1 rounded-full border
                                            border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                                                <Trophy className="size-2.5"/>
                                                100%
                                            </span>
                                        }
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <Progress
                                            value={pct}
                                            color="var(--brand)"
                                            className="w-24 max-sm:hidden"
                                            aria-label={`${ACHIEVEMENT_CATEGORY_LABELS[group.category]} progress`}
                                        />
                                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                            {group.unlockedCount}/{group.totalCount}
                                        </span>
                                    </div>
                                </button>

                                {!isCollapsed && (
                                    <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                                        {group.items.map((achievement) => (
                                            <AchievementCard
                                                key={achievement.id}
                                                achievement={achievement}
                                                isOwner={apiData.isOwner}
                                                compareMode={compareMode}
                                                revealAllSecrets={revealAllSecrets}
                                                pinPending={pinMutationPending}
                                                highlighted={highlight?.code === achievement.codeName}
                                                isPinned={pinnedSet.has(achievement.codeName)}
                                                onTogglePin={(codeName) => togglePin.mutate(codeName)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}

                    {secretCategoryItems.length > 0 && (() => {
                        const isSecretsCollapsed = collapsedCategories.has(AchievementCategory.SECRETS);
                        return (
                            <section aria-label="Secret achievements">
                                <button
                                    type="button"
                                    aria-expanded={!isSecretsCollapsed}
                                    onClick={() => toggleCategoryCollapsed(AchievementCategory.SECRETS)}
                                    className={cn(
                                        "group/cat-hdr mb-3.5 flex w-full items-center justify-between gap-3 py-1 text-left",
                                        groupedCategories.length > 0 && "border-t pt-6",
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {isSecretsCollapsed
                                            ? <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover/cat-hdr:text-foreground"/>
                                            : <ChevronDown className="size-4 text-muted-foreground transition-colors group-hover/cat-hdr:text-foreground"/>
                                        }
                                        <Lock className="size-3.5 text-fuchsia-400"/>
                                        <span className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover/cat-hdr:text-brand">
                                            Secrets
                                        </span>
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            {secretStats.unlocked}/{secretStats.total}
                                        </span>
                                    </div>
                                </button>
                                {!isSecretsCollapsed && (
                                    <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                                        {secretCategoryItems.map((achievement) => (
                                            <AchievementCard
                                                key={achievement.id}
                                                achievement={achievement}
                                                isOwner={apiData.isOwner}
                                                compareMode={compareMode}
                                                revealAllSecrets={revealAllSecrets}
                                                pinPending={pinMutationPending}
                                                highlighted={highlight?.code === achievement.codeName}
                                                isPinned={pinnedSet.has(achievement.codeName)}
                                                onTogglePin={(codeName) => togglePin.mutate(codeName)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })()}
                </div>
            ) : (
                <div className="mt-5">
                    {flatMainItems.length > 0 && (
                        <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                            {flatMainItems.map((achievement) => {
                                const pinnedPos = apiData.pinnedCodeNames.indexOf(achievement.codeName);
                                const allowReorder = statusFilter === "pinned" && effectiveSortMode === "default" && !query && pinnedPos >= 0;

                                return (
                                    <AchievementCard
                                        key={achievement.id}
                                        achievement={achievement}
                                        isOwner={apiData.isOwner}
                                        compareMode={compareMode}
                                        showCategory={currentCategory === "all"}
                                        revealAllSecrets={revealAllSecrets}
                                        pinPending={pinMutationPending}
                                        highlighted={highlight?.code === achievement.codeName}
                                        isPinned={pinnedSet.has(achievement.codeName)}
                                        canMovePrev={allowReorder && pinnedPos > 0}
                                        canMoveNext={allowReorder && pinnedPos < apiData.pinnedCodeNames.length - 1}
                                        onTogglePin={(codeName) => togglePin.mutate(codeName)}
                                        onMovePin={allowReorder ? (dir) => handleMovePin(achievement.codeName, dir) : undefined}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {flatHiddenItems.length > 0 && (
                        <section aria-label="Hidden achievements" className={cn(flatMainItems.length > 0 && "mt-7")}>
                            <div className="mb-3 flex items-center gap-2 border-t pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                <Lock className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400"/>
                                {flatHiddenItems.length} hidden {flatHiddenItems.length === 1 ? "achievement" : "achievements"} remaining
                            </div>
                            <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
                                {flatHiddenItems.map((achievement) => (
                                    <AchievementCard
                                        key={achievement.id}
                                        achievement={achievement}
                                        isOwner={apiData.isOwner}
                                        compareMode={compareMode}
                                        showCategory={currentCategory === "all"}
                                        revealAllSecrets={revealAllSecrets}
                                        highlighted={highlight?.code === achievement.codeName}
                                        isPinned={false}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onChangePage={handlePageChange}
            />
        </div>
    );
}
