import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {ListOrdered, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {userCollectionsFiltersSchema, UserCollectionsSearch} from "@/lib/schemas";
import {paginatedUserCollectionsOptions} from "@/lib/client/react-query/query-options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/collections/user/$username")({
    validateSearch: userCollectionsFiltersSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        return queryClient.ensureQueryData(paginatedUserCollectionsOptions({ username, ...search }));
    },
    component: UserCollectionsPage,
});


function UserCollectionsPage() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const mediaTypes = Object.values(MediaType);
    const { page = 1, search = "", mediaType } = filters;
    const apiData = useSuspenseQuery(paginatedUserCollectionsOptions({ username, ...filters })).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<UserCollectionsSearch>({ search });

    const isOwner = currentUser?.name === username;

    const handleMediaTypeChange = (value: string) => {
        void updateFilters({ page: 1, mediaType: value === "all" ? undefined : (value as MediaType) })
    }

    return (
        <PageTitle
            title={`${username} Collections`}
            subtitle={isOwner ? "Manage every collection in one place." : `Collections created by ${username}.`}
        >
            <div className="pt-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:flex-row sm:items-center sm:gap-4">
                    <div className="col-span-2 sm:w-60">
                        <SearchInput
                            className="w-full"
                            value={localSearch}
                            onChange={handleInputChange}
                            placeholder="Search collections..."
                        />
                    </div>

                    <div className="col-span-1 sm:mr-auto sm:w-40">
                        <Select value={mediaType ?? "all"} onValueChange={handleMediaTypeChange}>
                            <SelectTrigger className="w-full capitalize">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <MainThemeIcon type="all"/>
                                        <span>All Types</span>
                                    </div>
                                </SelectItem>
                                {mediaTypes.map((type) =>
                                    <SelectItem key={type} value={type} className="capitalize">
                                        <MainThemeIcon type={type}/>
                                        {type}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-5">
                        {isOwner &&
                            <Button asChild className="justify-center whitespace-nowrap" size="sm" variant="emeraldy">
                                <Route.Link to="/collections/create">
                                    <Plus className="size-4"/> New collection
                                </Route.Link>
                            </Button>
                        }
                        <div className="pr-2">
                            <QuickActions username={username}/>
                        </div>
                    </div>
                </div>

                {apiData.items.length === 0 ?
                    <EmptyState
                        className="py-20"
                        icon={ListOrdered}
                        message={search
                            ? `No collections found for '${search}'.`
                            : isOwner
                                ? "You have not created any collections yet."
                                : "No collections yet."
                        }
                    />
                    :
                    <div className="grid gap-4 gap-y-7 grid-cols-3 pt-4 max-sm:grid-cols-1">
                        {apiData.items.map((collection) =>
                            <CollectionCard
                                showOwner={false}
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
