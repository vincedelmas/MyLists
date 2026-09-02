import {monthlyActivitySearchSchema} from "@/lib/schemas";
import {createFileRoute, Outlet} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_viewer/activity/$username/_header")({
    validateSearch: monthlyActivitySearchSchema,
    component: ActivityHeader,
});


function ActivityHeader() {
    return <Outlet/>;
}
