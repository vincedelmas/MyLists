import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {formatNumber} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {LibraryBig, ListOrdered, Plus, UsersRound} from "lucide-react";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {communityCollectionsSchema, CommunitySearch} from "@/lib/schemas";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {communityCollectionsOptions} from "@/lib/client/react-query/query-options";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/collections/discover")({
    validateSearch: communityCollectionsSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        communityCollectionsQueryOptions: communityCollectionsOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.communityCollectionsQueryOptions);
    },
    component: CollectionsDiscoverPage,
});


function CollectionsDiscoverPage() {
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const { page = 1, search = "", mediaType } = filters;
    const { communityCollectionsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(communityCollectionsQueryOptions).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<CommunitySearch>({ search });

    const hasFilters = Boolean(search || mediaType);
    const mediaTypeItems = createMediaSelectItems(ALL_MEDIA_TYPES, { leading: "all", leadingLabel: "All types" });

    return (
        <PageTitle title="Community collections" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={UsersRound}
                    eyebrowIcon={ListOrdered}
                    eyebrow="Made by the community"
                    title="Community collections"
                    asideLabel={hasFilters ? "Collections found" : "Shared collections"}
                    description="Browse collections that people on MyLists have chosen to share."
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "collection" : "collections"}</>}
                />

                <div className="grid grid-cols-[minmax(0,1fr)_11rem_auto] items-center gap-3 pt-5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                    <SearchInput
                        value={localSearch}
                        onChange={handleInputChange}
                        placeholder="Search collections..."
                        aria-label="Search community collections"
                        className="w-full max-w-md max-sm:col-span-2"
                    />

                    <div className={cn("w-full", isAnonymous && "max-sm:col-span-2")}>
                        <Select
                            items={mediaTypeItems}
                            value={mediaType ?? "all"}
                            onValueChange={(value) => {
                                if (value !== null) {
                                    void updateFilters({
                                        page: 1,
                                        mediaType: value === "all" ? undefined : value as MediaType,
                                    });
                                }
                            }}
                        >
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

                    {!isAnonymous &&
                        <Link
                            to="/collections/create"
                            className={buttonVariants({ className: "whitespace-nowrap" })}
                        >
                            <Plus data-icon="inline-start"/>
                            New collection
                        </Link>
                    }
                </div>

                <div className="flex items-center justify-between gap-4 pb-4 pt-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {hasFilters ? "Filtered collections" : "Popular collections"}
                    </h2>
                    {apiData.pages > 1 &&
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            Page {page} / {apiData.pages}
                        </span>
                    }
                </div>

                {apiData.items.length === 0
                    ?
                    <EmptyState
                        iconSize={40}
                        icon={LibraryBig}
                        className="rounded-xl border py-20 shadow-xs"
                        message={search ? `No public collections found for “${search}”.` : "No public collections found."}
                    />
                    :
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {apiData.items.map((collection) =>
                            <CollectionCard key={collection.id} collection={collection} variant="showcase"/>
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
