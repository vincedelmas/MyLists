import {useSuspenseQuery} from "@tanstack/react-query";
import {profileHeaderSearchSchema} from "@/lib/schemas";
import {createFileRoute, Outlet} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {profileHeaderOptions} from "@/lib/client/react-query/query-options";
import {ProfileHeader} from "@/lib/client/components/user-profile/ProfileHeader";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header")({
    validateSearch: profileHeaderSearchSchema,
    context: ({ params: { username } }) => ({
        profileHeaderQueryOptions: profileHeaderOptions(username),
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.profileHeaderQueryOptions),
    component: ProfileTop,
});


function ProfileTop() {
    const navigate = Route.useNavigate();
    const { usernameNotice } = Route.useSearch();
    const { username: profileOwner } = Route.useParams();
    const { profileHeaderQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(profileHeaderQueryOptions).data;

    const onDismissNameNotice = () => {
        return navigate({ search: (prev) => ({ ...prev, usernameNotice: undefined }), replace: true });
    }

    return (
        <PageTitle title={`${profileOwner} Profile`} onlyHelmet>
            <ProfileHeader
                social={apiData.social}
                profileUser={apiData.userData}
                onDismissUsernameNotice={onDismissNameNotice}
                showUsernameNotice={usernameNotice === "assigned"}
            />
            <Outlet/>
        </PageTitle>
    );
}
