import React from "react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {BookOpen, Plus} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
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
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(communityCollectionsOptions(search));
    },
    component: CollectionsDiscoverPage,
});


function CollectionsDiscoverPage() {
    const { isAnonymous } = useAuth();
    const filters = Route.useSearch();
    const { page = 1, search = "", mediaType } = filters;
    const apiData = useSuspenseQuery(communityCollectionsOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<CommunitySearch>({ search });
    const mediaTypeItems = createMediaSelectItems(ALL_MEDIA_TYPES, { leading: "all", leadingLabel: "All Types" });

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
                            items={mediaTypeItems}
                            value={mediaType ?? "all"}
                            onValueChange={(val) => {
                                return updateFilters({ page: 1, mediaType: val === "all" ? undefined : (val as MediaType) })
                            }}
                        >
                            <SelectTrigger className="w-full capitalize">
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
                        <Link to="/collections/create" className={buttonVariants({ className: "max-sm:max-w-36" })}>
                            <Plus className="shrink-0"/> New collection
                        </Link>
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
