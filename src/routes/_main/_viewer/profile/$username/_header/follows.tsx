import {UserX} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {followsOptions} from "@/lib/client/react-query/query-options";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {FollowButton} from "@/lib/client/components/user-profile/FollowButton";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/follows")({
    context: ({ params: { username } }) => ({
        followsQueryOptions: followsOptions(username),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.followsQueryOptions, staleTime: "static" });
    },
    component: ProfileFollows,
    head: () => ({ meta: [{ title: "Follows - MyLists" }] }),
});


function ProfileFollows() {
    const { currentUser } = useAuth();
    const { username: profileOwner } = Route.useParams();
    const { followsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(followsQueryOptions).data;
    const isViewingOwnProfile = currentUser?.name === profileOwner;

    return (
        <div className="flex flex-col mx-auto mb-8 pt-6">
            <header>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    Follows
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isViewingOwnProfile ? "People you subscribe to their updates." : `People followed by ${profileOwner}`}
                </p>
            </header>
            <div className="mt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {apiData.follows.map((follow) =>
                        <FollowCard
                            key={follow.id}
                            follow={follow}
                            profileOwner={profileOwner}
                            currentUsername={currentUser?.name}
                            isViewingOwnProfile={isViewingOwnProfile}
                        />
                    )}
                </div>

                {apiData.follows.length === 0 &&
                    <div className="flex flex-col items-center justify-center pt-20 text-center">
                        <EmptyState
                            icon={UserX}
                            message="No Follows Found."
                        />
                    </div>
                }
            </div>
        </div>
    );
}


interface FollowCardProps {
    profileOwner: string;
    currentUsername?: string;
    isViewingOwnProfile: boolean;
    follow: {
        id: number;
        username: string;
        privacy: PrivacyType;
        image: string | null;
        myFollowStatus: SocialState | null;
    };
}


function FollowCard({ follow, currentUsername, profileOwner, isViewingOwnProfile }: FollowCardProps) {
    const isOwner = currentUsername === follow.username;

    return (
        <div className="flex flex-col justify-between space-y-5 rounded-xl border p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ProfileIcon
                            className="size-13"
                            fallbackSize="text-lg"
                            user={{ name: follow.username, image: follow.image }}
                        />
                        <div
                            title={`Privacy: ${follow.privacy}`}
                            className="absolute -bottom-1 -right-1 rounded-full border bg-background p-0.5"
                        >
                            <div className="rounded-full p-0.5">
                                <PrivacyIcon type={follow.privacy}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Link to="/profile/$username" params={{ username: follow.username }}>
                            <h3 className="font-medium leading-none text-foreground hover:text-brand">
                                {follow.username}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {follow.privacy} Profile
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {!currentUsername &&
                    <Button variant="outline" className="flex-1" disabled={true}>
                        Log-In to Follow
                    </Button>
                }

                {currentUsername &&
                    <>
                        {isOwner ?
                            <Button variant="secondary" className="flex-1" disabled={true}>
                                You
                            </Button>
                            :
                            <FollowButton
                                targetUserId={follow.id}
                                profileUsername={profileOwner}
                                followStatus={follow.myFollowStatus}
                                followLabel={isViewingOwnProfile ? "Follow Back" : "Follow"}
                                className="w-auto flex-1 font-medium"
                            />
                        }
                    </>
                }
            </div>
        </div>
    );
}
