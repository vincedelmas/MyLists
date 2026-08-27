import {Clock3} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
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

    return (
        <PageTitle title="MyLists Statistics" subtitle="Statistics across the MyLists community">
            <TabHeader tabs={mediaTabs} activeTab={activeTab} setActiveTab={handleTabChange}>
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

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                    onSelectMediaType={handleTabChange}
                />
            </div>
        </PageTitle>
    );
}
