import {createFileRoute, Outlet} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header")({
    component: StatsHeader,
});


function StatsHeader() {
    return <Outlet/>;
}
