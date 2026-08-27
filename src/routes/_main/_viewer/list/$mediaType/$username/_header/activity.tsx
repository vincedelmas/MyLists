import {createFileRoute} from "@tanstack/react-router";
import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {MonthlyActivityContent} from "@/lib/client/components/activity/MonthlyActivityContent";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/list/$mediaType/$username/_header/activity")({
    validateSearch: monthlyActivitySearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, username }, deps: { search } }) => ({
        activityQueryOptions: monthlyActivityOptions(username, { ...search, activeTab: mediaType }),
        activityStatsQueryOptions: monthlyActivityStatsOptions(username, {
            mediaType,
            year: search.year,
            view: search.view,
            month: search.month,
        }),
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(context.activityQueryOptions),
            context.queryClient.ensureQueryData(context.activityStatsQueryOptions),
        ]);
    },
    component: ListActivityPage,
});


function ListActivityPage() {
    const filters = Route.useSearch();
    const { mediaType, username } = Route.useParams();
    const { activityQueryOptions, activityStatsQueryOptions } = Route.useRouteContext();

    return (
        <MonthlyActivityContent
            filters={filters}
            username={username}
            fixedMediaType={mediaType}
            activityQueryOptions={activityQueryOptions}
            activityStatsQueryOptions={activityStatsQueryOptions}
        />
    );
}
