import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {userStatsOptions} from "@/lib/client/react-query/query-options";
import {DashboardContent} from "@/lib/client/components/media-stats/DashboardContent";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/stats")({
    context: ({ params: { mediaType, username } }) => ({
        userStatsQueryOptions: userStatsOptions(username, mediaType),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.userStatsQueryOptions);
    },
    component: UserStatsPage,
});


function UserStatsPage() {
    const { userStatsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(userStatsQueryOptions).data;

    return (
        <>
            <DashboardContent
                data={apiData}
            />
        </>
    );
}
