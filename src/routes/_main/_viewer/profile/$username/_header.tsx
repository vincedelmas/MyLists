import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ProfileHeader} from "@/lib/client/components/user-profile/ProfileHeader";
import {profileHeaderOptions} from "@/lib/client/react-query/query-options";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header")({
    loader: async ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(profileHeaderOptions(username));
    },
    component: ProfileTop,
});


function ProfileTop() {
    const { username: profileOwner } = Route.useParams();
    const apiData = useSuspenseQuery(profileHeaderOptions(profileOwner)).data;

    return (
        <PageTitle title={`${profileOwner} Profile`} onlyHelmet>
            <ProfileHeader
                social={apiData.social}
                profileUser={apiData.userData}
            />
            <Outlet/>
        </PageTitle>
    );
}
