import {createFileRoute} from "@tanstack/react-router";
import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {MonthlyActivityContent} from "@/lib/client/components/activity/MonthlyActivityContent";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/activity/$username/_header/")({
    validateSearch: monthlyActivitySearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { username }, deps: { search } }) => ({
        activityQueryOptions: monthlyActivityOptions(username, search),
        activityStatsQueryOptions: monthlyActivityStatsOptions(username, { year: search.year, month: search.month, view: search.view }),
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(context.activityQueryOptions),
            context.queryClient.ensureQueryData(context.activityStatsQueryOptions),
        ]);
    },
    component: MonthlyActivityPage,
});


function MonthlyActivityPage() {
    const filters = Route.useSearch();
    const { username } = Route.useParams();
    const { activityQueryOptions, activityStatsQueryOptions } = Route.useRouteContext();

    return (
        <MonthlyActivityContent
            filters={filters}
            username={username}
            activityQueryOptions={activityQueryOptions}
            activityStatsQueryOptions={activityStatsQueryOptions}
        />
    );
}
