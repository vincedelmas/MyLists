import {activitySearchSchema} from "@/lib/schemas";
import {formatMonth} from "@/lib/utils/date-formatting";
import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";


export const Route = createFileRoute("/_main/_viewer/activity/$username/_header")({
    validateSearch: activitySearchSchema,
    component: ActivityHeader,
});


function ActivityHeader() {
    const { username } = Route.useParams();
    const { year, month } = Route.useSearch();

    return (
        <PageTitle title={`${formatMonth(month)} Activity`} subtitle={`${username} activity for ${year}`}>
            <Outlet/>
        </PageTitle>
    );
}
