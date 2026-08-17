import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {StatsActiveTab, statsActiveTabSchema} from "@/lib/schemas";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {userStatsOptions} from "@/lib/client/react-query/query-options";
import {QuickActions} from "@/lib/client/components/general/QuickActions";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";
import {createMediaTabItems} from "@/lib/client/components/general/media-type-options";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header/")({
    validateSearch: statsActiveTabSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        return queryClient.ensureQueryData(userStatsOptions(username, search.activeTab));
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const navigate = Route.useNavigate();
    const { username } = Route.useParams();
    const { activeTab } = Route.useSearch();
    const apiData = useSuspenseQuery(userStatsOptions(username, activeTab)).data;
    const mediaTabs = createMediaTabItems(apiData.activatedMediaTypes, { leading: "overview" });

    const handleTabChange = async (value: StatsActiveTab) => {
        await navigate({ search: { activeTab: value } });
    };

    return (
        <>
            <TabHeader tabs={mediaTabs} activeTab={activeTab} setActiveTab={handleTabChange}>
                <QuickActions
                    username={username}
                />
            </TabHeader>

            <div className="mt-6">
                <DashboardContent
                    data={apiData}
                    subjectName={username}
                    onSelectMediaType={handleTabChange}
                />
            </div>
        </>
    );
}
