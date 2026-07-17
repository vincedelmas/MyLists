import {UserX} from "lucide-react";
import {MEDIA_TYPES} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {HofCard} from "@/lib/client/components/hall-of-fame/HofCard";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {HallOfFameSearch, hallOfFameSearchSchema} from "@/lib/schemas";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {hallOfFameOptions} from "@/lib/client/react-query/query-options";
import {HofRanking} from "@/lib/client/components/hall-of-fame/HofRanking";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/hall-of-fame")({
    validateSearch: hallOfFameSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(hallOfFameOptions(search));
    },
    component: HallOfFamePage,
});


function HallOfFamePage() {
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const apiData = useSuspenseQuery(hallOfFameOptions(filters)).data;
    const { page = 1, sorting = "normalized", search = "" } = filters;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<HallOfFameSearch>({ search });

    return (
        <PageTitle title="Hall of Fame" subtitle="Showcase of all the active profiles ranked">
            <div className="grid grid-cols-12 w-250 mx-auto gap-x-10 max-lg:w-full max-lg:grid-cols-1">
                <div className="col-span-7 w-full max-lg:col-span-1 max-lg:mt-4 max-lg:order-2">
                    <div className="flex items-center justify-between mt-3 mb-3">
                        <div className="flex items-center justify-start gap-3">
                            <SearchInput
                                className="w-55"
                                value={localSearch}
                                onChange={handleInputChange}
                                placeholder="Search by name..."
                            />
                        </div>
                        <div>
                            <Select
                                value={sorting}
                                disabled={apiData.items.length === 0}
                                onValueChange={(val) => updateFilters({ page: 1, sorting: val })}
                            >
                                <SelectTrigger className="w-32.5 font-medium bg-outline border">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normalized">Normalized</SelectItem>
                                    <SelectItem value="profile">Profile</SelectItem>
                                    {MEDIA_TYPES.map((mt) =>
                                        <SelectItem key={mt} value={mt}>
                                            {capitalize(mt)}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {apiData.items.length === 0 ?
                        <EmptyState
                            icon={UserX}
                            message={`No users found for '${search}'`}
                        />
                        :
                        apiData.items.map((userData) =>
                            <HofCard
                                key={userData.name}
                                userData={userData}
                            />
                        )
                    }
                    <Pagination
                        currentPage={page}
                        totalPages={apiData.pages}
                        onChangePage={(page) => updateFilters({ page })}
                    />
                </div>

                <div className="relative h-fit col-span-5 mt-5.25 max-lg:col-span-1 max-lg:mt-4 max-lg:order-1">
                    <LockedContent
                        showAuthButtons={true}
                        title="Statistics Locked"
                        isAnonymous={isAnonymous}
                        description="Sign in to unlock your ranking, see where you are on the leaderboard, and track your stats."
                    />
                    <HofRanking
                        userRanks={apiData.userRanks}
                    />
                </div>
            </div>
        </PageTitle>
    );
}
