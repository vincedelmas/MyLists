import {useAuth} from "@/lib/client/hooks/use-auth";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Trophy, UsersRound, UserX} from "lucide-react";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {formatNumber} from "@/lib/utils/number-formatting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {HofCard} from "@/lib/client/components/hall-of-fame/HofCard";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {HallOfFameSearch, hallOfFameSearchSchema} from "@/lib/schemas";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {hallOfFameOptions} from "@/lib/client/react-query/query-options";
import {HofRanking} from "@/lib/client/components/hall-of-fame/HofRanking";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/hall-of-fame")({
    validateSearch: hallOfFameSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        hallOfFameQueryOptions: hallOfFameOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.hallOfFameQueryOptions);
    },
    component: HallOfFamePage,
});


const sortingItems = [
    { label: "Overall", value: "normalized" },
    { label: "Profile level", value: "profile" },
    ...ALL_MEDIA_TYPES.map((mediaType) => ({
        label: capitalize(mediaType),
        value: mediaType,
    })),
];


function HallOfFamePage() {
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const { hallOfFameQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(hallOfFameQueryOptions).data;
    const { page = 1, sorting = "normalized", search = "" } = filters;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<HallOfFameSearch>({ search, options: { resetScroll: false } });

    const rankingDescription = sorting === "normalized"
        ? "Overall ranking balances progress across every active media type."
        : sorting === "profile"
            ? "Profile level follows total tracked time across every list."
            : `${capitalize(sorting)} ranking follows tracked time in that type.`;

    return (
        <PageTitle title="Hall of Fame" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Hall of Fame"
                    eyebrowIcon={Trophy}
                    asideIcon={UsersRound}
                    eyebrow="The rankings"
                    asideLabel={search ? "People found" : "People ranked"}
                    description="See who has reached the highest levels on MyLists, and where you stand."
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "profile" : "profiles"}</>}
                />

                <section className="grid grid-cols-[minmax(0,1fr)_minmax(19.5rem,0.7fr)] items-start gap-6 pt-8 max-lg:grid-cols-1">
                    <section className="min-w-0">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                <Trophy className="size-4" aria-hidden="true"/>
                                All-time board
                            </div>
                            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                                Community ranking
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                {rankingDescription}
                            </p>
                        </div>

                        <FieldGroup className="mt-6 flex-row items-end gap-3 max-sm:flex-col max-sm:items-stretch">
                            <Field className="min-w-0 flex-1">
                                <FieldLabel
                                    htmlFor="hall-of-fame-search"
                                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                                >
                                    Find a profile
                                </FieldLabel>
                                <SearchInput
                                    id="hall-of-fame-search"
                                    className="w-full"
                                    value={localSearch}
                                    onChange={handleInputChange}
                                    placeholder="Search by name..."
                                />
                            </Field>
                            <Field className="w-48 max-sm:w-full">
                                <FieldLabel
                                    htmlFor="hall-of-fame-sorting"
                                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                                >
                                    Rank by
                                </FieldLabel>
                                <Select
                                    value={sorting}
                                    items={sortingItems}
                                    onValueChange={(value) => {
                                        if (value !== null) updateFilters({ page: 1, sorting: value });
                                    }}
                                >
                                    <SelectTrigger id="hall-of-fame-sorting" className="w-full">
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
                            </Field>
                        </FieldGroup>

                        <div className="mt-5 overflow-hidden rounded-xl border shadow-xs">
                            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-2 border-b px-1 py-2
                            md:grid-cols-[2.5rem_minmax(8rem,0.7fr)_5rem_minmax(14rem,1.3fr)]">
                                <span className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Rank
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Profile
                                </span>
                                <span className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Level
                                </span>
                                <span className="border-l pl-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground max-md:hidden">
                                    Media levels
                                </span>
                            </div>
                            {apiData.items.length === 0
                                ?
                                <EmptyState
                                    icon={UserX}
                                    className="min-h-40"
                                    message={search ? `No profiles found for “${search}”.` : "No ranked profiles yet."}
                                />
                                :
                                apiData.items.map((userData) =>
                                    <HofCard
                                        key={userData.id}
                                        userData={userData}
                                    />
                                )
                            }
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={apiData.pages}
                            onChangePage={(nextPage) => updateFilters({ page: nextPage })}
                        />
                    </section>

                    <aside className="relative h-fit max-lg:order-first lg:sticky lg:top-20">
                        <LockedContent
                            showAuthButtons={true}
                            isAnonymous={isAnonymous}
                            title="Personal rankings locked"
                            description="Sign in to see how close you are to every category's leaders."
                        />

                        <HofRanking
                            userRanks={apiData.userRanks}
                        />
                    </aside>
                </section>
            </div>
        </PageTitle>
    );
}
