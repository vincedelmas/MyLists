import type z from "zod";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {listsSearchSchema} from "@/lib/schemas/lists.schema";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {DynamicListCard} from "@/lib/client/components/dynamic-lists/DynamicListCard";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {ArrowUpRight, Layers3, LibraryBig, ListOrdered, LockKeyhole, Play, Plus} from "lucide-react";
import {Card, CardAction, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {listsCollectionsOptions, userListViewsOptions} from "@/lib/client/react-query/query-options/lists.options";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_viewer/lists/$username")({
    validateSearch: listsSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { username }, deps: { search: { kind: _kind, dynamicPage, page, perPage, ...filters } } }) => ({
        viewsQueryOptions: userListViewsOptions({ username, ...filters, dynamicPage }),
        collectionsQueryOptions: listsCollectionsOptions({ username, ...filters, page, perPage }),
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(context.viewsQueryOptions),
            context.queryClient.ensureQueryData(context.collectionsQueryOptions),
        ]);
    },
    component: ListsPage,
});


const kindItems = [
    { value: "all", label: "Lists & collections" },
    { value: "presets", label: "Tracking lists" },
    { value: "dynamic", label: "Dynamic lists" },
    { value: "collections", label: "Collections" },
];


function ListsPage() {
    const filters = Route.useSearch();
    const { username } = Route.useParams();
    const { viewsQueryOptions, collectionsQueryOptions } = Route.useRouteContext();
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<z.infer<typeof listsSearchSchema>>({
        search: filters.search ?? "", options: { resetScroll: false }, resetFilters: { dynamicPage: 1 },
    });

    const viewsQuery = useSuspenseQuery(viewsQueryOptions);
    const collectionsQuery = useSuspenseQuery(collectionsQueryOptions);

    if (viewsQuery.isError) throw viewsQuery.error;
    if (collectionsQuery.isError) throw collectionsQuery.error;

    const collections = collectionsQuery.data;
    const query = filters.search?.trim().toLocaleLowerCase() ?? "";
    const { presets, views, isOwner, canReadTracking, activeMediaTypes } = viewsQuery.data;
    const mediaItems = createMediaSelectItems(activeMediaTypes, { leading: "all", leadingLabel: "All types" });

    const matchesTitle = (title: string) => title.toLocaleLowerCase().includes(query);
    const visiblePresets = presets.filter(preset => (!filters.mediaType || preset.mediaType === filters.mediaType) && matchesTitle(preset.mediaType));

    const showContinue = canReadTracking && matchesTitle("Continue")
        && (!filters.mediaType || (filters.mediaType !== MediaType.MOVIES && presets.some(preset => preset.mediaType === filters.mediaType)));

    const showPresets = canReadTracking && (!filters.kind || filters.kind === "presets");
    const showDynamic = canReadTracking && (!filters.kind || filters.kind === "dynamic");

    const showCollections = !filters.kind || filters.kind === "collections";
    const showDynamicSection = showDynamic && (isOwner || viewsQuery.data.total > 0);
    const showCollectionsSection = showCollections && (isOwner || collections.total > 0);

    const hasFilters = query.length > 0 || filters.mediaType !== undefined;
    const hasResults = (showPresets && (visiblePresets.length > 0 || showContinue))
        || (showDynamic && viewsQuery.data.total > 0) || (showCollections && collections.total > 0);

    return (
        <PageTitle title={`${isOwner ? "Your" : username + "'s"} lists & collections`} onlyHelmet>
            <div className="flex min-w-0 flex-col gap-8 pt-8 pb-12">
                <PageHeader
                    eyebrowIcon={LibraryBig}
                    title="Lists & collections"
                    eyebrow={isOwner ? "Your library" : `${username}'s library`}
                    description={isOwner
                        ? "Follow your progress, explore your dynamic lists and revisit your collections."
                        : `Explore ${username}'s tracking lists and collections.`
                    }
                />

                <div className="flex flex-wrap items-center gap-3 -mt-4">
                    <SearchInput
                        value={localSearch}
                        onChange={handleInputChange}
                        className="min-w-0 flex-1 basis-64"
                        aria-label="Search lists & collections"
                        placeholder="Search lists & collections…"
                    />
                    <Select
                        items={kindItems}
                        value={filters.kind ?? "all"}
                        onValueChange={value => {
                            if (value !== null) {
                                updateFilters({ kind: value === "all" ? undefined : value as typeof filters.kind, page: 1, dynamicPage: 1 });
                            }
                        }}
                    >
                        <SelectTrigger aria-label="Filter by kind" className="w-[175px] max-sm:grow">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {kindItems.map(item =>
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Select
                        items={mediaItems}
                        value={filters.mediaType ?? "all"}
                        onValueChange={value => {
                            if (value !== null) {
                                updateFilters({ mediaType: value === "all" ? undefined : value as MediaType, page: 1, dynamicPage: 1 });
                            }
                        }}
                    >
                        <SelectTrigger aria-label="Filter by media type" className="w-[150px] max-sm:grow">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>{mediaItems.map(item =>
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <QuickActions
                        username={username}
                    />
                </div>

                {!canReadTracking && <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LockKeyhole/>
                        </EmptyMedia>
                        <EmptyTitle>
                            Tracking lists are private
                        </EmptyTitle>
                        <EmptyDescription>
                            This profile limits access to its tracking lists. You can browse any public collections from this profile.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>}

                {showPresets && (visiblePresets.length > 0 || showContinue) &&
                    <section aria-labelledby="tracking-lists-title" className="flex flex-col gap-4">
                        <h2 id="tracking-lists-title" className="flex items-center gap-2 text-lg font-semibold">
                            <LibraryBig className="size-5 text-brand"/> Tracking lists
                        </h2>
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                            {visiblePresets.map(preset =>
                                <Card key={preset.mediaType} size="sm" className="relative transition-shadow hover:ring-brand hover:shadow-sm">
                                    <Link
                                        to="/lists/tracking/$mediaType/$username"
                                        params={{ username, mediaType: preset.mediaType }}
                                        aria-label={`${capitalize(preset.mediaType)} list`}
                                        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <CardHeader className="pointer-events-none">
                                        <CardTitle className="flex items-center gap-2">
                                            <MainThemeIcon type={preset.mediaType}/>{capitalize(preset.mediaType)}
                                        </CardTitle>
                                        <CardDescription>
                                            {formatNumber(preset.totalEntries)} media
                                        </CardDescription>
                                        <CardAction>
                                            <ArrowUpRight className="size-4 text-muted-foreground"/>
                                        </CardAction>
                                    </CardHeader>
                                </Card>
                            )}
                            {showContinue &&
                                <Card size="sm" className="relative transition-shadow hover:ring-brand hover:shadow-sm">
                                    <Link
                                        aria-label="Continue list"
                                        to="/lists/continue/$username" params={{ username }}
                                        search={{ activeTab: filters.mediaType === MediaType.MOVIES ? undefined : filters.mediaType }}
                                        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <CardHeader className="pointer-events-none">
                                        <CardTitle className="flex items-center gap-2">
                                            <Play className="size-4 text-brand"/>Continue
                                        </CardTitle>
                                        <CardDescription>
                                            Media on going
                                        </CardDescription>
                                        <CardAction>
                                            <ArrowUpRight className="size-4 text-muted-foreground"/>
                                        </CardAction>
                                    </CardHeader>
                                </Card>
                            }
                        </div>
                    </section>
                }

                {showDynamicSection &&
                    <section aria-labelledby="dynamic-lists-title" className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h2 id="dynamic-lists-title" className="flex items-center gap-2 text-lg font-semibold">
                                    <Layers3 className="size-5 text-brand"/>
                                    Dynamic lists
                                </h2>
                                <InfoPopover label="About dynamic lists" title="What is a dynamic list?" iconClassName="mt-0.5">
                                    <div className="space-y-3 text-sm text-muted-foreground font-normal">
                                        <p>
                                            A dynamic list is a saved view of the media you track.
                                            Choose rules like: status, rating or tags, and combine one or more media types.
                                        </p>
                                        <p>
                                            Results update as your tracking changes.
                                            For example, show movies and series that have been in Plan to Watch for more than six months.
                                        </p>
                                    </div>
                                </InfoPopover>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {viewsQuery.data.total > 0 &&
                                    <span className="text-sm tabular-nums text-muted-foreground">
                                        {formatNumber(viewsQuery.data.total)} dynamic {viewsQuery.data.total === 1 ? "list" : "lists"}
                                    </span>
                                }
                                {isOwner &&
                                    <Link to="/lists/dynamic/create" className={buttonVariants({ size: "sm" })}>
                                        <Plus data-icon="inline-start"/>
                                        Create dynamic list
                                    </Link>
                                }
                            </div>
                        </div>
                        {views.length > 0 ?
                            <>
                                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                                    {views.map(view =>
                                        <DynamicListCard
                                            view={view}
                                            key={view.id}
                                            isOwner={isOwner}
                                            preview={view.preview}
                                            activeMediaTypes={activeMediaTypes}
                                        />
                                    )}
                                </div>
                                <Pagination
                                    currentPage={viewsQuery.data.page}
                                    totalPages={viewsQuery.data.pages}
                                    onChangePage={dynamicPage => updateFilters({ dynamicPage })}
                                />
                            </>
                            :
                            <Empty className="min-h-40 border">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Layers3/>
                                    </EmptyMedia>
                                    <EmptyTitle>
                                        {hasFilters
                                            ? "No matching dynamic lists"
                                            : "No dynamic lists yet"
                                        }
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        {hasFilters
                                            ? "Try another search or media type."
                                            : "Create a dynamic list to group media with rules that follow your tracking progress."
                                        }
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        }
                    </section>
                }

                {showCollectionsSection &&
                    <section aria-labelledby="collections-title" className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="collections-title" className="flex items-center gap-2 text-lg font-semibold">
                                <ListOrdered className="size-5 text-brand"/>
                                Collections
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                {collections.total > 0 &&
                                    <span className="text-sm tabular-nums text-muted-foreground">
                                        {formatNumber(collections.total)} collections
                                    </span>
                                }
                                {isOwner &&
                                    <Link to="/lists/collections/create" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
                                        <Plus data-icon="inline-start"/>
                                        Create collection
                                    </Link>
                                }
                            </div>
                        </div>
                        {collections.total > 0 ?
                            <>
                                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                                    {collections.items.map(collection =>
                                        <CollectionCard
                                            showOwner={false}
                                            key={collection.id}
                                            collection={collection}
                                        />
                                    )}
                                </div>
                                <Pagination
                                    currentPage={collections.page}
                                    totalPages={collections.pages}
                                    onChangePage={page => updateFilters({ page })}
                                />
                            </>
                            :
                            <Empty className="min-h-40 border">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <ListOrdered/>
                                    </EmptyMedia>
                                    <EmptyTitle>
                                        {hasFilters
                                            ? "No matching collections"
                                            : "No collections yet"
                                        }
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        {hasFilters
                                            ? "Try another search or media type."
                                            : "Create a collection to group media and arrange them your way."
                                        }
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        }
                    </section>
                }

                {!hasResults && canReadTracking && !showDynamicSection && !showCollectionsSection &&
                    <Empty className="min-h-60 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <LibraryBig/>
                            </EmptyMedia>
                            <EmptyTitle>
                                Nothing here yet
                            </EmptyTitle>
                            <EmptyDescription>
                                {query || filters.mediaType
                                    ? "Try another search or media type."
                                    : isOwner
                                        ? "Create a list or collection to organize your media."
                                        : "No lists or collections to show."
                                }
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                }
            </div>
        </PageTitle>
    );
}
