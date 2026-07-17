import {MEDIA_TYPES} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";
import {platformStatsOptions} from "@/lib/client/react-query/query-options";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";


export const Route = createFileRoute("/_main/_viewer/platform-stats")({
    validateSearch: statsActiveTabSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(platformStatsOptions(search.activeTab));
    },
    component: PlatformStatsPage,
});


function PlatformStatsPage() {
    const navigate = Route.useNavigate();
    const { activeTab } = Route.useSearch();
    const mediaTypes = MEDIA_TYPES;
    const apiData = useSuspenseQuery(platformStatsOptions(activeTab)).data;

    const handleTabChange = async (value: StatsActiveTab) => {
        await navigate({ search: { activeTab: value } });
    };

    const mediaTabs: TabItem<StatsActiveTab>[] = [
        {
            id: "overview",
            isAccent: true,
            label: "Overview",
            icon: <MainThemeIcon size={15} type="overview"/>,
        },
        ...mediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

    return (
        <PageTitle title="MyLists Statistics" subtitle="Comprehensive media tracking insights">
            <TabHeader
                tabs={mediaTabs}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
            />

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                />
            </div>
        </PageTitle>
    );
}
