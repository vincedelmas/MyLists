import {cn} from "@/lib/utils/classnames";
import {mediaTabSearchSchema} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute, Link} from "@tanstack/react-router";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {ContinueGrid} from "@/lib/client/components/continue/ContinueGrid";
import {ArrowDownWideNarrow, LibraryBig, Play, Search} from "lucide-react";
import {useContinueOrder} from "@/lib/client/components/continue/use-continue-order";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {continueOptions} from "@/lib/client/react-query/query-options/continue.options";
import {groupContinueItems} from "@/lib/client/components/continue/group-continue-items";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export const Route = createFileRoute("/_main/_viewer/lists/continue/$username")({
    validateSearch: mediaTabSearchSchema,
    loader: ({ params: { username }, context: { queryClient } }) => {
        return queryClient.ensureQueryData(continueOptions(username));
    },
    component: ContinuePage,
});


function ContinuePage() {
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const { activeTab } = Route.useSearch();
    const isOwner = currentUser?.name === username;
    const { data } = useSuspenseQuery(continueOptions(username));

    const orderedItems = useContinueOrder(data.items);
    const currentTab = data.mediaTypes.find(type => type === activeTab) ?? "all";

    const items = currentTab === "all" ? orderedItems : orderedItems.filter(item => item.mediaType === currentTab);
    const { active, finished } = groupContinueItems(items);

    const tabs = createMediaTabItems(data.mediaTypes, { leading: "all" }).map(tab => ({
        ...tab,
        label: (
            <span className="flex items-center gap-2">
                {tab.label}
                <Badge variant="secondary">
                    {tab.id === "all" ? data.items.length : data.items.filter(item => item.mediaType === tab.id).length}
                </Badge>
            </span>
        ),
    }));

    return (
        <PageTitle title="Continue" onlyHelmet>
            <div className="flex flex-col gap-4 pt-4 pb-12 sm:gap-6 sm:pt-8">
                <PageHeader
                    title="Continue"
                    asideIcon={LibraryBig}
                    asideLabel="In progress"
                    eyebrow={<ListsBackLink username={username}/>}
                    asideValue={`${data.items.length} ${data.items.length === 1 ? "title" : "titles"}`}
                    description={isOwner
                        ? "Pick up where you left off. Your current watchings, readings, and playings, all in one place."
                        : `What ${username} is currently watching, reading and playing.`
                    }
                    navigation={
                        <TabHeader
                            tabs={tabs}
                            value={currentTab}
                            triggerClassName="max-sm:px-3"
                            trailing={<QuickActions username={username} mediaType={currentTab === "all" ? undefined : currentTab}/>}
                            renderTrigger={(tab, props) =>
                                <Link
                                    {...props}
                                    resetScroll={false}
                                    to="/lists/continue/$username" params={{ username }}
                                    search={{ activeTab: tab.id === "all" ? undefined : tab.id }}
                                />
                            }
                        />
                    }
                />

                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowDownWideNarrow className="size-4" aria-hidden="true"/>
                    Most recent updated first
                </p>

                {items.length > 0 ?
                    <>
                        {active.length > 0 &&
                            <section aria-label="Continue media">
                                <ContinueGrid
                                    items={active}
                                    key={currentTab}
                                    readOnly={!isOwner}
                                />
                            </section>
                        }

                        {finished.length > 0 &&
                            <section aria-labelledby="finished-progress-title" className="flex flex-col gap-4 pt-4">
                                <div className="flex flex-col gap-2">
                                    <h2 id="finished-progress-title" className="flex items-center gap-2 text-base font-semibold">
                                        Ready to mark completed
                                        <Badge variant="secondary">{finished.length}</Badge>
                                    </h2>
                                    {isOwner &&
                                        <p className="text-sm text-muted-foreground">
                                            These titles are at their last known episode, chapter, or page.
                                            Keep them here or mark them completed when you're ready.
                                        </p>
                                    }
                                </div>
                                <ContinueGrid
                                    key={currentTab}
                                    items={finished}
                                    readOnly={!isOwner}
                                />
                            </section>
                        }
                    </>
                    :
                    <Empty className="min-h-80 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Play/>
                            </EmptyMedia>
                            <EmptyTitle>
                                {data.mediaTypes.length === 0
                                    ? "Make room for your next story"
                                    : "Nothing in progress here yet"
                                }
                            </EmptyTitle>
                            <EmptyDescription>
                                {data.mediaTypes.length === 0
                                    ? "Enable a series, anime, books, manga, or games list to start tracking your progress."
                                    : "Set a title to Watching, Reading, or Playing in your lists and it will be waiting here."
                                }
                            </EmptyDescription>
                        </EmptyHeader>
                        {isOwner &&
                            <EmptyContent>
                                {data.mediaTypes.length === 0 ?
                                    <Link to="/settings/content-lists" className={buttonVariants()}>
                                        Manage my lists
                                    </Link>
                                    :
                                    <Link to="/search" className={buttonVariants()}>
                                        <Search data-icon="inline-start"/> Find something to start
                                    </Link>
                                }
                                {currentTab !== "all" &&
                                    <Link
                                        params={{ username }}
                                        to="/lists/continue/$username"
                                        search={{ activeTab: undefined }}
                                        className={cn(buttonVariants({ variant: "hover" }))}
                                    >
                                        View all in progress
                                    </Link>
                                }
                            </EmptyContent>
                        }
                    </Empty>
                }
            </div>
        </PageTitle>
    );
}
