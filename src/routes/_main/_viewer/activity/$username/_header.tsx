import {formatMonth} from "@/lib/utils/date-formatting";
import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";


export const Route = createFileRoute("/_main/_viewer/activity/$username/_header")({
    validateSearch: monthlyActivitySearchSchema,
    component: ActivityHeader,
});


function ActivityHeader() {
    const { username } = Route.useParams();
    const { year, month, view } = Route.useSearch();

    const title = view === "year"
        ? `${year} Activity`
        : `${formatMonth(month)} Activity`;

    return (
        <PageTitle title={title} subtitle={`${username} activity for ${year}`}>
            <Outlet/>
        </PageTitle>
    );
}
