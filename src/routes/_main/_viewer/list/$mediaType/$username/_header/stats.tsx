import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {userStatsOptions} from "@/lib/client/react-query/query-options";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/stats")({
    loader: async ({ context: { queryClient }, params: { mediaType, username } }) => {
        return queryClient.ensureQueryData(userStatsOptions(username, mediaType));
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const { mediaType, username } = Route.useParams();
    const apiData = useSuspenseQuery(userStatsOptions(username, mediaType)).data;

    return (
        <>
            <DashboardContent
                data={apiData}
            />
        </>
    );
}
