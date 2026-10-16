import {createFileRoute} from "@tanstack/react-router";
import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {formatMonth} from "@/lib/utils/formatting/date";
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
            context.queryClient.query({ ...context.activityQueryOptions, staleTime: "static" }),
            context.queryClient.query({ ...context.activityStatsQueryOptions, staleTime: "static" }),
        ]);
    },
    component: MonthlyActivityPage,
    head: ({ params: { username }, match: { search } }) => {
        const period = search.view === "year" ? search.year : `${formatMonth(search.month)} ${search.year}`;
        return { meta: [{ title: `${period} activity for ${username} - MyLists` }] };
    },
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
