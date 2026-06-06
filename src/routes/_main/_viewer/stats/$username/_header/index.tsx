import {MediaType} from "@/lib/utils/enums";
import {TabValue} from "@/lib/types/stats.types";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {DashboardContent} from "@/lib/client/media-stats/DashboardContent";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {userStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header/")({
    validateSearch: (search) => search as { mediaType?: MediaType },
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        return queryClient.ensureQueryData(userStatsOptions(username, search));
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const selectedTab: TabValue = filters?.mediaType ?? "overview";
    const apiData = useSuspenseQuery(userStatsOptions(username, filters)).data;

    const handleTabChange = async (value: string) => {
        await navigate({ search: value === "overview" ? undefined : { mediaType: value as MediaType } });
    };

    const mediaTabs: TabItem<"overview" | MediaType>[] = [
        {
            id: "overview",
            isAccent: true,
            label: "Overview",
            icon: <MainThemeIcon size={15} type="overview"/>,
        },
        ...apiData.activatedMediaTypes.map((mediaType) => ({
            id: mediaType,
            label: mediaType,
            icon: <MainThemeIcon size={15} type={mediaType}/>,
        })),
    ];

    return (
        <>
            <TabHeader tabs={mediaTabs} activeTab={selectedTab} setActiveTab={handleTabChange}>
                <QuickActions
                    username={username}
                />
            </TabHeader>

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                    selectedTab={selectedTab}
                />
            </div>
        </>
    );
}
