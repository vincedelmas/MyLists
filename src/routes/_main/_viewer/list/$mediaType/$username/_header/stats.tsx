import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {DashboardContent} from "@/lib/client/media-stats/DashboardContent";
import {userStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/stats")({
    loader: async ({ context: { queryClient }, params: { mediaType, username } }) => {
        return queryClient.ensureQueryData(userStatsOptions(username, { mediaType }));
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const { mediaType, username } = Route.useParams();
    const apiData = useSuspenseQuery(userStatsOptions(username, { mediaType })).data;

    return (
        <>
            <DashboardContent
                // @ts-expect-error - mediaType should be MediaType | undefined but here always defined (normal)
                data={apiData}
                selectedTab={mediaType}
            />
        </>
    );
}
