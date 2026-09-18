import {MediaType} from "@/lib/utils/enums";
import {mediaTabSearchSchema} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/formatting/text";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {ComingNextItem} from "@/lib/types/query.options.types";
import {CalendarClock, CalendarDays, List} from "lucide-react";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {upcomingOptions} from "@/lib/client/react-query/query-options";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";
import {ComingNextSection} from "@/lib/client/components/coming-next/ComingNextSection";
import {compareCalendarDates, formatCalendarRelativeDate} from "@/lib/utils/formatting/date";


export const Route = createFileRoute("/_main/_private/coming-next")({
    validateSearch: mediaTabSearchSchema,
    context: () => ({ upcomingQueryOptions: upcomingOptions }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.upcomingQueryOptions),
    component: ComingNextPage,
});


function ComingNextPage() {
    const { activeTab } = Route.useSearch();
    const { upcomingQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(upcomingQueryOptions).data;

    const mediaTypes = apiData.map((next) => next.mediaType);
    const allItems = apiData.flatMap(g => g.items.map(item => ({ ...item, mediaType: g.mediaType })));

    const upcomingItems = allItems.filter((item) => {
        if (!item.date) return true;
        const days = formatCalendarRelativeDate(item.date).diffDays;
        return days === null || days >= -7;
    });

    const mediaTabs = createMediaTabItems(mediaTypes, { leading: "all" }).map(tab => ({
        ...tab,
        label: (
            <span className="flex items-center gap-2">
                {tab.label}
                <Badge variant="secondary">
                    {tab.id === "all"
                        ? upcomingItems.length
                        : upcomingItems.filter(item => item.mediaType === tab.id).length
                    }
                </Badge>
            </span>
        ),
    }));

    const currentTab = mediaTabs.some((tab) => tab.id === activeTab) ? activeTab : "all";

    const filteredByTab = currentTab === "all"
        ? upcomingItems
        : upcomingItems.filter((item) => item.mediaType === currentTab);

    const processedData = filteredByTab.sort((a, b) => compareCalendarDates(a.date, b.date));

    const sections: Record<string, (ComingNextItem & { mediaType: MediaType })[]> = {
        tba: [],
        today: [],
        later: [],
        thisWeek: [],
        next30Days: [],
    };

    processedData.forEach((item) => {
        const days = formatCalendarRelativeDate(item.date).diffDays;

        if (item.date === null || days === null) {
            sections.tba.push(item);
        }
        else if (days <= 0) {
            sections.today.push(item);
        }
        else if (days <= 7) {
            sections.thisWeek.push(item);
        }
        else if (days <= 30) {
            sections.next30Days.push(item);
        }
        else {
            sections.later.push(item);
        }
    });

    return (
        <PageTitle title="Coming Next" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Coming Next"
                    asideIcon={CalendarDays}
                    eyebrowIcon={CalendarClock}
                    eyebrow="Your release calendar"
                    description="See when your next episodes, premieres and releases arrive."
                    asideLabel={currentTab === "all" ? "Coming up" : `${capitalize(currentTab)} coming up`}
                    asideValue={<>{formatNumber(processedData.length)} {processedData.length === 1 ? "release" : "releases"}</>}
                    navigation={
                        <TabHeader
                            tabs={mediaTabs}
                            value={currentTab}
                            triggerClassName="max-sm:px-3"
                            renderTrigger={(tab, props) =>
                                <Link
                                    {...props}
                                    to="/coming-next"
                                    resetScroll={false}
                                    search={{ activeTab: tab.id === "all" ? undefined : tab.id }}
                                />
                            }
                        />
                    }
                />

                <div className="space-y-8 pt-7 pb-12">
                    <ComingNextSection
                        title="Releasing now"
                        items={sections.today}
                    />
                    <ComingNextSection
                        title="This week"
                        items={sections.thisWeek}
                    />
                    <ComingNextSection
                        title="Coming this month"
                        items={sections.next30Days}
                    />
                    <ComingNextSection
                        items={sections.later}
                        title="Later this year"
                    />
                    <ComingNextSection
                        items={sections.tba}
                        title="To be announced"
                    />

                    {processedData.length === 0 &&
                        <EmptyState
                            icon={List}
                            iconSize={40}
                            className="min-h-72 rounded-xl border shadow-xs"
                            message={`No upcoming ${currentTab === "all" ? "media" : currentTab} found.`}
                        />
                    }
                </div>
            </div>
        </PageTitle>
    );
}
