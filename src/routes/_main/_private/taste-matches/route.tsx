import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Label} from "@/lib/client/components/ui/label";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {HeartHandshake, UsersRound} from "lucide-react";
import {Switch} from "@/lib/client/components/ui/switch";
import {formatNumber} from "@/lib/utils/number-formatting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {tasteMatchesOptions} from "@/lib/client/react-query/query-options";
import {TasteMatchesSearch, tasteMatchesSearchSchema} from "@/lib/schemas";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {FeaturedTasteMatch, TasteMatchCard} from "@/lib/client/components/taste-matches/TasteMatchCard";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/taste-matches")({
    validateSearch: tasteMatchesSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        tasteMatchesQueryOptions: tasteMatchesOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.tasteMatchesQueryOptions);
    },
    component: TasteMatchesPage,
});


const sortingItems = [
    { label: "Best match", value: "match" },
    { label: "Shared ratings", value: "overlap" },
];


function TasteMatchesPage() {
    const { currentUser } = useAuth();
    const filters = Route.useSearch();
    const { tasteMatchesQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(tasteMatchesQueryOptions).data;
    const { page = 1, search = "", activeTab = "all", hideFollowed = false, sorting = "match" } = filters;

    const activeMediaTypes = getActiveMediaTypes(currentUser?.settings);
    const mediaTabs = createMediaTabItems(activeMediaTypes, { leading: "all" });
    const currentActiveTab = activeTab !== "all" && activeMediaTypes.includes(activeTab) ? activeTab : "all";
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<TasteMatchesSearch>({ search });

    const handleSortChange = (value: TasteMatchesSearch["sorting"] | null) => {
        if (value === null) return;
        void updateFilters({ page: 1, sorting: value as TasteMatchesSearch["sorting"] });
    }

    const handleTabChange = async (value: string) => {
        void updateFilters({ page: 1, activeTab: value as ("all" | MediaType) })
    };

    return (
        <PageTitle title="Taste matches" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Taste matches"
                    asideIcon={UsersRound}
                    eyebrowIcon={HeartHandshake}
                    asideLabel="Matches found"
                    eyebrow="People with similar taste"
                    description="Find people whose ratings are closest to yours."
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "match" : "matches"}</>}
                    navigation={
                        <TabHeader
                            tabs={mediaTabs}
                            className="max-sm:px-3"
                            activeTab={currentActiveTab}
                            setActiveTab={handleTabChange}
                        />
                    }
                />

                <div className="grid grid-cols-[minmax(0,1fr)_10rem_auto] items-center gap-3 pt-5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                    <SearchInput
                        value={localSearch}
                        onChange={handleInputChange}
                        aria-label="Search taste matches"
                        placeholder="Search by username..."
                        className="w-full max-w-md max-sm:col-span-2"
                    />
                    <Select items={sortingItems} value={sorting} onValueChange={handleSortChange}>
                        <SelectTrigger aria-label="Sort taste matches" className="w-full">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {sortingItems.map((item) =>
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <div className="flex shrink-0 items-center gap-2">
                        <Switch
                            id="hide-followed"
                            checked={hideFollowed}
                            onCheckedChange={(checked) => updateFilters({ page: 1, hideFollowed: checked })}
                        />
                        <Label htmlFor="hide-followed" className="whitespace-nowrap text-sm">
                            Hide follows
                        </Label>
                    </div>
                </div>

                <section className="pt-6">
                    {apiData.featuredMatch &&
                        <FeaturedTasteMatch
                            activeTab={currentActiveTab}
                            match={apiData.featuredMatch}
                        />
                    }

                    {(apiData.items.length > 0 || apiData.total === 0) &&
                        <>
                            <div className={cn(
                                "flex items-center justify-between gap-4",
                                apiData.featuredMatch && "mt-8",
                            )}>
                                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    {apiData.featuredMatch ? "More matches" : "Taste matches"}
                                </h2>
                                {apiData.pages > 1 &&
                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                        Page {page} / {apiData.pages}
                                    </span>
                                }
                            </div>

                            {apiData.total === 0
                                ?
                                <EmptyState
                                    iconSize={44}
                                    icon={UsersRound}
                                    className="mt-4 min-h-72 rounded-xl border shadow-xs"
                                    message={search
                                        ? `No taste matches found for “${search}”.`
                                        : `No matches yet. Rate at least ${apiData.minimumSharedRatings} titles also rated by other members.`
                                    }
                                />
                                :
                                <div className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
                                    {apiData.items.map((match) =>
                                        <TasteMatchCard
                                            match={match}
                                            key={match.id}
                                            activeTab={currentActiveTab}
                                        />
                                    )}
                                </div>
                            }

                            <Pagination
                                currentPage={page}
                                totalPages={apiData.pages}
                                onChangePage={(nextPage) => updateFilters({ page: nextPage })}
                            />
                        </>
                    }
                </section>
            </div>
        </PageTitle>
    );
}
