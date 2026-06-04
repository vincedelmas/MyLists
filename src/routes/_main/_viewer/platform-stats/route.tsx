import {MediaType} from "@/lib/utils/enums";
import {TabValue} from "@/lib/types/stats.types";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {DashboardContent} from "@/lib/client/media-stats/DashboardContent";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {platformStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/platform-stats")({
    validateSearch: (search) => search as { mediaType?: MediaType },
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(platformStatsOptions(search));
    },
    component: PlatformStatsPage,
});


function PlatformStatsPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const selectedTab: TabValue = filters?.mediaType ?? "overview";
    const apiData = useSuspenseQuery(platformStatsOptions(filters)).data;

    const handleTabChange = async (value: string) => {
        await navigate({ search: value === "overview" ? undefined : { mediaType: value as MediaType } });
    };

    const mediaTypes = Object.values(MediaType);
    const mediaTabs: TabItem<"overview" | MediaType>[] = [
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
                activeTab={selectedTab}
                setActiveTab={handleTabChange}
            />

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                    selectedTab={selectedTab}
                />
            </div>
        </PageTitle>
    );
}
