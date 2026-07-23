import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {MonthlyActivityContent} from "@/lib/client/components/activity/MonthlyActivityContent";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/activity/$username/_header/")({
    validateSearch: monthlyActivitySearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        await Promise.all([
            queryClient.ensureQueryData(monthlyActivityOptions(username, search)),
            queryClient.ensureQueryData(monthlyActivityStatsOptions(username, { year: search.year, month: search.month })),
        ]);
    },
    component: MonthlyActivityPage,
});


function MonthlyActivityPage() {
    const filters = Route.useSearch();
    const { username } = Route.useParams();

    return (
        <MonthlyActivityContent
            filters={filters}
            username={username}
        />
    );
}
