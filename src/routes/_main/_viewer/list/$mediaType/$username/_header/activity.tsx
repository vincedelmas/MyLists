import {createFileRoute} from "@tanstack/react-router";
import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {MonthlyActivityContent} from "@/lib/client/components/activity/MonthlyActivityContent";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/activity")({
    validateSearch: monthlyActivitySearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, params: { mediaType, username }, deps: { search } }) => {
        await Promise.all([
            queryClient.ensureQueryData(monthlyActivityOptions(username, { ...search, activeTab: mediaType })),
            queryClient.ensureQueryData(monthlyActivityStatsOptions(username, { mediaType, year: search.year, view: search.view, month: search.month })),
        ]);
    },
    component: ListActivityPage,
});


function ListActivityPage() {
    const filters = Route.useSearch();
    const { mediaType, username } = Route.useParams();

    return (
        <MonthlyActivityContent
            filters={filters}
            username={username}
            fixedMediaType={mediaType}
        />
    );
}
