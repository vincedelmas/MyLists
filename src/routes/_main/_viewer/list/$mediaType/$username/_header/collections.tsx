import React from "react";
import {ListOrdered, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {SimpleSearch, simpleSearchSchema} from "@/lib/schemas";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {paginatedUserCollectionsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/collections")({
    validateSearch: simpleSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, username }, deps: { search } }) => ({
        collectionsQueryOptions: paginatedUserCollectionsOptions({ username, mediaType, ...search }),
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.collectionsQueryOptions),
    component: CollectionsTab,
});


function CollectionsTab() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { mediaType, username } = Route.useParams();
    const { collectionsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionsQueryOptions).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SimpleSearch>({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const isOwner = (currentUser?.name === username);

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {isOwner ? "Your" : username} Collections
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Curated {mediaType} collections by {isOwner ? "you" : username}.
                    </p>
                </div>

                <div className="flex items-center gap-4 max-sm:w-full">
                    {isOwner &&
                        <Route.Link to="/collections/create" className={buttonVariants({ className: "whitespace-nowrap" })}>
                            <Plus/> New collection
                        </Route.Link>
                    }
                    <SearchInput
                        value={localSearch}
                        onChange={handleInputChange}
                        placeholder="Find in collection..."
                        className="w-max-md max-sm:min-w-0 max-sm:flex-1"
                    />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 gap-y-7 max-sm:grid-cols-1">
                {apiData.items.length === 0 ?
                    <EmptyState
                        className="col-span-full py-20"
                        icon={ListOrdered}
                        message={filters.search
                            ? `No collections found matching "${filters.search}".`
                            : isOwner
                                ? "You have not created any collections yet."
                                : "No collections yet."
                        }
                    />
                    :
                    apiData.items.map((collection) =>
                        <CollectionCard
                            showOwner={false}
                            key={collection.id}
                            collection={collection}
                        />
                    )
                }
            </div>
            <Pagination
                currentPage={apiData.page}
                totalPages={apiData.pages}
                onChangePage={(page) => updateFilters({ page })}
            />
        </>
    );
}
