import {UsersRound} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Switch} from "@/lib/client/components/ui/switch";
import {formatNumber} from "@/lib/utils/number-formatting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {tasteMatchesOptions} from "@/lib/client/react-query/query-options";
import {TasteMatchesSearch, tasteMatchesSearchSchema} from "@/lib/schemas";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {FeaturedTasteMatch, TasteMatchCard} from "@/lib/client/components/taste-matches/TasteMatchCard";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/taste-matches")({
    validateSearch: tasteMatchesSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(tasteMatchesOptions(search));
    },
    component: TasteMatchesPage,
});


function TasteMatchesPage() {
    const { currentUser } = useAuth();
    const filters = Route.useSearch();
    const { page = 1, search = "", activeTab = "all", hideFollowed = false, sorting = "match" } = filters;

    const apiData = useSuspenseQuery(tasteMatchesOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<TasteMatchesSearch>({ search });

    const activeMediaTypes = currentUser?.settings.filter(({ active }) => active).map(({ mediaType }) => mediaType) ?? [];
    const currentActiveTab = activeTab !== "all" && activeMediaTypes.includes(activeTab) ? activeTab : "all";

    const handleSortChange = (value: TasteMatchesSearch["sorting"]) => {
        void updateFilters({ page: 1, sorting: value as TasteMatchesSearch["sorting"] });
    }

    const handleTabChange = async (value: string) => {
        void updateFilters({ page: 1, activeTab: value as ("all" | MediaType) })
    };

    const mediaTabs: TabItem<"all" | MediaType>[] = [
        {
            id: "all",
            label: "All",
            isAccent: true,
            icon: <MainThemeIcon size={15} type="all"/>,
        },
        ...activeMediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

    return (
        <PageTitle title="Find your taste matches" subtitle="Members ranked by how closely their ratings line up with yours.">
            <div className="space-y-6">
                <TabHeader
                    tabs={mediaTabs}
                    activeTab={currentActiveTab}
                    setActiveTab={handleTabChange}
                />
                <div className="space-y-4 -mt-2">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <SearchInput
                            value={localSearch}
                            className="w-full lg:w-80"
                            onChange={handleInputChange}
                            placeholder="Search by username..."
                        />
                        <div className="flex flex-wrap items-center gap-4">
                            <label htmlFor="hide-followed" className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                                Hide follows
                                <Switch
                                    id="hide-followed"
                                    checked={hideFollowed}
                                    className="data-[state=checked]:bg-app-accent"
                                    onCheckedChange={(checked) => updateFilters({ page: 1, hideFollowed: checked })}
                                />
                            </label>
                            <span className="text-sm text-muted-foreground">
                                Sort by
                            </span>
                            <Select value={sorting} onValueChange={handleSortChange}>
                                <SelectTrigger className="w-40 max-sm:w-fit">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="match">Best match</SelectItem>
                                    <SelectItem value="overlap">Shared ratings</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {apiData.featuredMatch &&
                    <FeaturedTasteMatch
                        activeTab={currentActiveTab}
                        match={apiData.featuredMatch}
                    />
                }

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersRound className="size-4"/>
                    {formatNumber(apiData.total)} {apiData.total === 1 ? "user" : "users"} with a similar taste
                </div>

                {apiData.total === 0 ?
                    <EmptyState
                        iconSize={44}
                        icon={UsersRound}
                        className="min-h-72 rounded-xl border bg-card"
                        message={search
                            ? `No taste matches found for "${search}".`
                            : `No matches yet. Rate at least ${apiData.minimumSharedRatings} titles also rated by other members.`
                        }
                    />
                    :
                    apiData.items.length > 0 &&
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            </div>
        </PageTitle>
    );
}
