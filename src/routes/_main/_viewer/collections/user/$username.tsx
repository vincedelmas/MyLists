import {MediaType} from "@/lib/utils/enums";
import {ListOrdered, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {formatNumber} from "@/lib/utils/number-formatting";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {userCollectionsFiltersSchema, UserCollectionsSearch} from "@/lib/schemas";
import {paginatedUserCollectionsOptions} from "@/lib/client/react-query/query-options";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/collections/user/$username")({
    validateSearch: userCollectionsFiltersSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { username }, deps: { search } }) => ({
        userCollectionsQueryOptions: paginatedUserCollectionsOptions({ username, ...search }),
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.userCollectionsQueryOptions),
    component: UserCollectionsPage,
});


function UserCollectionsPage() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const isOwner = currentUser?.name === username;
    const { page = 1, search = "", mediaType } = filters;
    const { userCollectionsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(userCollectionsQueryOptions).data;
    const mediaTypeItems = createMediaSelectItems(ALL_MEDIA_TYPES, { leading: "all", leadingLabel: "All types" });
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<UserCollectionsSearch>({ search });
    const hasFilters = Boolean(search || mediaType);

    const handleMediaTypeChange = (value: string | null) => {
        if (value === null) return;
        void updateFilters({ page: 1, mediaType: value === "all" ? undefined : (value as MediaType) })
    }

    return (
        <PageTitle
            onlyHelmet
            title={isOwner ? "Your Collections" : `${username} Collections`}
        >
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={ListOrdered}
                    eyebrowIcon={ListOrdered}
                    eyebrow={isOwner ? "Your library" : "Shared collections"}
                    title={isOwner ? "Your collections" : `${username}'s collections`}
                    asideLabel={hasFilters ? "Collections found" : isOwner ? "Collections saved" : "Shared here"}
                    description={isOwner
                        ? "Find, edit and revisit the collections you’ve made."
                        : `Browse the collections ${username} has chosen to share.`
                    }
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "collection" : "collections"}</>}
                />

                <div className="grid grid-cols-[minmax(0,1fr)_11rem_auto] items-center gap-3 pt-5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                    <SearchInput
                        className="w-full max-w-md max-sm:col-span-2"
                        value={localSearch}
                        onChange={handleInputChange}
                        placeholder="Search collections..."
                        aria-label={`Search ${isOwner ? "your" : `${username}'s`} collections`}
                    />

                    <div className="w-full">
                        <Select items={mediaTypeItems} value={mediaType ?? "all"} onValueChange={handleMediaTypeChange}>
                            <SelectTrigger aria-label="Filter by media type" className="w-full capitalize">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {mediaTypeItems.map((item) =>
                                        <SelectItem key={item.value} value={item.value} className="capitalize">
                                            {item.label}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-end gap-4">
                        {isOwner &&
                            <Route.Link
                                to="/collections/create"
                                className={buttonVariants({ variant: "default", className: "justify-center whitespace-nowrap" })}
                            >
                                <Plus data-icon="inline-start"/> New collection
                            </Route.Link>
                        }
                        <QuickActions username={username}/>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pb-4 pt-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {hasFilters ? "Filtered collections" : isOwner ? "Your collection shelf" : `${username}'s collection shelf`}
                    </h2>
                    {apiData.pages > 1 &&
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            Page {page} / {apiData.pages}
                        </span>
                    }
                </div>

                {apiData.items.length === 0 ?
                    <EmptyState
                        className="rounded-xl border py-20 shadow-xs"
                        icon={ListOrdered}
                        message={search
                            ? `No collections found for '${search}'.`
                            : isOwner
                                ? "You have not created any collections yet."
                                : "No collections yet."
                        }
                    />
                    :
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {apiData.items.map((collection) =>
                            <CollectionCard
                                showOwner={false}
                                key={collection.id}
                                collection={collection}
                                variant="showcase"
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
