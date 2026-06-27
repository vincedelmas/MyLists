import {useState} from "react";
import {List} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ComingNextItem} from "@/lib/types/query.options.types";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {upcomingOptions} from "@/lib/client/react-query/query-options";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {ComingNextSection} from "@/lib/client/components/coming-next/ComingNextSection";
import {compareCalendarDates, formatCalendarRelativeDate} from "@/lib/utils/date-formatting";


export const Route = createFileRoute("/_main/_private/coming-next")({
    loader: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(upcomingOptions);
    },
    component: ComingNextPage,
});


function ComingNextPage() {
    const apiData = useSuspenseQuery(upcomingOptions).data;
    const mediaTypes = apiData.map((next) => next.mediaType);
    const [activeTab, setActiveTab] = useState<"all" | MediaType>("all");
    const allItems = apiData.flatMap(g => g.items.map(item => ({ ...item, mediaType: g.mediaType })));
    const filteredByTab = activeTab === "all" ? allItems : allItems.filter((item) => item.mediaType === activeTab);

    const processedData = filteredByTab.filter((item) => {
        if (!item.date) return true;
        const days = formatCalendarRelativeDate(item.date).diffDays;
        return days === null || days >= -7;
    }).sort((a, b) => compareCalendarDates(a.date, b.date));

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

    const mediaTabs: TabItem<"all" | MediaType>[] = [
        {
            id: "all",
            label: "All",
            isAccent: true,
            icon: <MainThemeIcon size={15} type="all"/>,
        },
        ...mediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

    return (
        <PageTitle title="Coming Next" subtitle="Your personalized schedule for upcoming episodes, premieres, and releases.">
            <TabHeader
                tabs={mediaTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <div className="space-y-10 mt-7 mb-12">
                <ComingNextSection
                    title="Releasing Now"
                    items={sections.today}
                />
                <ComingNextSection
                    title="This Week"
                    items={sections.thisWeek}
                />
                <ComingNextSection
                    title="Coming this Month"
                    items={sections.next30Days}
                />
                <ComingNextSection
                    items={sections.later}
                    title="Later this Year"
                />
                <ComingNextSection
                    items={sections.tba}
                    title="To Be Announced"
                />

                {processedData.length === 0 &&
                    <EmptyState
                        icon={List}
                        iconSize={35}
                        className="py-20"
                        message={`No upcoming ${activeTab === "all" ? "media" : activeTab} found`}
                    />
                }
            </div>
        </PageTitle>
    );
}
