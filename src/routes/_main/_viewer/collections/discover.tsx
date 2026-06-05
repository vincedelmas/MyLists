import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {BookOpen, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {CommunitySearch} from "@/lib/types/collections.types";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {communityCollectionsOptions} from "@/lib/client/react-query/query-options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/collections/discover")({
    validateSearch: (search) => search as CommunitySearch,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(communityCollectionsOptions(search));
    },
    component: CollectionsDiscoverPage,
});


const DEFAULT = { page: 1, search: "" } satisfies CommunitySearch;


function CollectionsDiscoverPage() {
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const mediaTypes = Object.values(MediaType);
    const { page = DEFAULT.page, search = DEFAULT.search, mediaType } = filters;
    const apiData = useSuspenseQuery(communityCollectionsOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<CommunitySearch>({ search });

    return (
        <PageTitle title="Community collections" subtitle="Public collections created and shared by the community.">
            <div className="pt-2">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-center sm:gap-4">
                    <div className="col-span-2 sm:w-60">
                        <SearchInput
                            className="w-full"
                            value={localSearch}
                            onChange={handleInputChange}
                            placeholder="Search collections..."
                        />
                    </div>

                    <div className={cn("sm:w-40 col-span-1", !isAnonymous && "sm:mr-auto")}>
                        <Select
                            value={mediaType ?? "all"}
                            onValueChange={(val) => {
                                return updateFilters({ page: 1, mediaType: val === "all" ? undefined : (val as MediaType) })
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {mediaTypes.map((mediaType) =>
                                    <SelectItem key={mediaType} value={mediaType} className="capitalize">
                                        {mediaType}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {!isAnonymous &&
                        <Button asChild className="col-span-1 justify-center whitespace-nowrap sm:w-auto">
                            <Link to="/collections/create">
                                <Plus className="size-4 shrink-0"/> New collection
                            </Link>
                        </Button>
                    }
                </div>

                {apiData.items.length === 0 ?
                    <EmptyState
                        iconSize={40}
                        icon={BookOpen}
                        className="py-20"
                        message={`No public collections found${search ? ` for '${search}'` : ""}.`}
                    />
                    :
                    <div className="grid gap-4 grid-cols-3 pt-4 max-sm:grid-cols-1">
                        {apiData.items.map((collection) =>
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
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
