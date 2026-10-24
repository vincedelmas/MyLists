import {useAuth} from "@/lib/client/hooks/use-auth";
import {hallOfFameSearchSchema} from "@/lib/schemas";
import {capitalize} from "@/lib/utils/formatting/text";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Trophy, UsersRound, UserX} from "lucide-react";
import {formatNumber} from "@/lib/utils/formatting/number";
import {HofCard} from "@/lib/client/components/hall-of-fame/HofCard";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {hallOfFameOptions} from "@/lib/client/react-query/query-options";
import {HofRanking} from "@/lib/client/components/hall-of-fame/HofRanking";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/hall-of-fame")({
    validateSearch: hallOfFameSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        hallOfFameQueryOptions: hallOfFameOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.hallOfFameQueryOptions, staleTime: "static" });
    },
    component: HallOfFamePage,
    head: () => ({ meta: [{ title: "Hall of Fame - MyLists" }] }),
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
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate(filters, { resetScroll: false });

    return (
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

            <section className="grid grid-cols-[minmax(0,1fr)_minmax(19.5rem,0.7fr)] items-start gap-6 max-lg:grid-cols-1">
                <section className="min-w-0 mt-6">
                    <FieldGroup className="flex-row items-end gap-3 max-sm:flex-col max-sm:items-stretch">
                        <Field className="min-w-0 flex-1">
                            <FieldLabel
                                htmlFor="hall-of-fame-search"
                                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                            >
                                Find a profile
                            </FieldLabel>
                            <SearchInput
                                className="w-full"
                                value={localSearch}
                                id="hall-of-fame-search"
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
                        <div
                            className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-2 border-b px-1 py-2
                            md:grid-cols-[2.5rem_minmax(8rem,0.7fr)_5rem_minmax(14rem,1.3fr)]"
                        >
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

                        {apiData.items.length === 0 ?
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

                <aside className="relative h-fit max-lg:order-first lg:sticky lg:top-15 pt-6">
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
    );
}
