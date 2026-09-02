import {ChartNoAxesColumnIncreasing, Clock3} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatHours} from "@/lib/utils/number-formatting";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {platformStatsOptions} from "@/lib/client/react-query/query-options";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";


export const Route = createFileRoute("/_main/_viewer/platform-stats")({
    validateSearch: statsActiveTabSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        platformStatsQueryOptions: platformStatsOptions(search.activeTab),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.platformStatsQueryOptions);
    },
    component: PlatformStatsPage,
});


function PlatformStatsPage() {
    const navigate = Route.useNavigate();
    const { activeTab } = Route.useSearch();
    const { platformStatsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(platformStatsQueryOptions).data;
    const mediaTabs = createMediaTabItems(ALL_MEDIA_TYPES, { leading: "overview" });

    const handleTabChange = async (value: StatsActiveTab) => {
        await navigate({ search: { activeTab: value } });
    };

    const isOverview = apiData.kind === "overview";
    const trackedHours = isOverview ? apiData.totalHours : apiData.timeSpentHours;

    return (
        <PageTitle title="Platform statistics" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="MyLists stats"
                    asideIcon={Clock3}
                    eyebrow="Across the community"
                    asideValue={formatHours(trackedHours)}
                    eyebrowIcon={ChartNoAxesColumnIncreasing}
                    asideLabel={isOverview ? "Total time tracked" : `${capitalize(apiData.mediaType)} time tracked`}
                    description="A look at what people are tracking, rating and enjoying across MyLists."
                    navigation={
                        <TabHeader
                            tabs={mediaTabs}
                            className="max-sm:px-3"
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                        >
                            <div
                                title="Platform statistics are cached for up to 24 hours"
                                className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
                            >
                                <Clock3 className="size-3.5"/>
                                <span className="max-sm:hidden">
                                    Updated daily
                                </span>
                                <span className="sm:hidden">
                                    Daily
                                </span>
                            </div>
                        </TabHeader>
                    }
                />

                <DashboardContent
                    data={apiData}
                    showHero={false}
                    onSelectMediaType={handleTabChange}
                />
            </div>
        </PageTitle>
    );
}
