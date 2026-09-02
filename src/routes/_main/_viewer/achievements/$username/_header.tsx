import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";


export const Route = createFileRoute("/_main/_viewer/achievements/$username/_header")({
    component: AchievementLayout,
});


function AchievementLayout() {
    const { username } = Route.useParams();

    return (
        <PageTitle title={`${username} Achievements`} onlyHelmet>
            <Outlet/>
        </PageTitle>
    );
}
