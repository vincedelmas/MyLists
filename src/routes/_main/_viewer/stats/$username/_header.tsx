import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";


export const Route = createFileRoute("/_main/_viewer/stats/$username/_header")({
    component: StatsHeader,
});


function StatsHeader() {
    const { username } = Route.useParams();

    return (
        <PageTitle
            title={
                <div className="flex items-center gap-1.5">
                    <span>{username} Statistics</span>
                    <InfoPopover label="Statistics cache information">
                        Statistics are cached for up to one hour, so recent changes may take time to appear.
                    </InfoPopover>
                </div>
            }
            subtitle={`Detailed media statistics for ${username}`}
        >
            <Outlet/>
        </PageTitle>
    );
}
