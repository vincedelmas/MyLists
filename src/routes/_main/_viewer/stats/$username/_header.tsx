import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header")({
    component: StatsHeader,
});


function StatsHeader() {
    const { username } = Route.useParams();

    return (
        <PageTitle title={`${username} Statistics`} subtitle="Comprehensive media tracking insights">
            <Outlet/>
        </PageTitle>
    );
}
