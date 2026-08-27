import {cn} from "@/lib/utils/classnames";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {toast} from "@/lib/client/components/ui/toast";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Clock, UserCheck, UserPlus, UserX} from "lucide-react";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {followsOptions} from "@/lib/client/react-query/query-options";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {useFollowMutation, useUnfollowMutation,} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/follows")({
    context: ({ params: { username } }) => ({
        followsQueryOptions: followsOptions(username),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.followsQueryOptions);
    },
    component: ProfileFollows,
});


function ProfileFollows() {
    const { currentUser } = useAuth();
    const { username: profileOwner } = Route.useParams();
    const { followsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(followsQueryOptions).data;

    const isViewingOwnProfile = currentUser?.name === profileOwner;

    return (
        <PageTitle
            title="Follows"
            subtitle={isViewingOwnProfile ? "People you subscribe to their updates." : `People followed by ${profileOwner}`}
        >
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
        </PageTitle>
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
        <div className="flex flex-col justify-between rounded-xl border p-4 space-y-5">
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
                            className="bg-background absolute -bottom-1 -right-1 rounded-full border p-0.5"
                        >
                            <div className="rounded-full p-0.5">
                                <PrivacyIcon type={follow.privacy}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Link to="/profile/$username" params={{ username: follow.username }}>
                            <h3 className="text-foreground hover:text-brand font-medium leading-none">
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
                            <FollowActionButton
                                targetUserId={follow.id}
                                profileOwner={profileOwner}
                                followStatus={follow.myFollowStatus}
                                isViewingOwnProfile={isViewingOwnProfile}
                            />
                        }
                    </>
                }
            </div>
        </div>
    );
}


interface FollowActionButtonProps {
    targetUserId: number;
    profileOwner: string;
    isViewingOwnProfile: boolean;
    followStatus: SocialState | null;
}


function FollowActionButton({ targetUserId, followStatus, profileOwner, isViewingOwnProfile }: FollowActionButtonProps) {
    const followMutation = useFollowMutation(profileOwner);
    const unfollowMutation = useUnfollowMutation(profileOwner);
    const isPending = followMutation.isPending || unfollowMutation.isPending;

    const handleClick = () => {
        const mutation = followStatus ? unfollowMutation : followMutation;

        mutation.mutate({ data: { targetUserId } }, {
            onError: () => toast.add({ title: "Sorry, an error occurred...", type: "error", priority: "high" })
        });
    };

    const variant = followStatus === SocialState.ACCEPTED
        ? "selected" : followStatus === SocialState.REQUESTED
            ? "secondary" : "outline";

    return (
        <Button
            variant={variant}
            disabled={isPending}
            onClick={handleClick}
            className={cn("group flex-1 font-medium transition-all",
                followStatus && "hover:bg-destructive/30 hover:text-foreground")}
        >
            {isPending ?
                <Spinner data-icon="inline-start" className="size-3.5"/>
                :
                followStatus === SocialState.ACCEPTED ?
                    <>
                        <span className="flex items-center gap-2 group-hover:hidden">
                            <UserCheck className="size-3.5"/> Following
                        </span>
                        <span className="hidden items-center gap-2 group-hover:flex">
                            <UserX className="size-3.5"/> Unfollow
                        </span>
                    </>
                    :
                    followStatus === SocialState.REQUESTED ?
                        <>
                            <span className="flex items-center gap-2 group-hover:hidden">
                                <Clock className="size-3.5"/> Requested
                            </span>
                            <span className="hidden items-center gap-2 group-hover:flex">
                                <UserX className="size-3.5"/> Cancel
                            </span>
                        </>
                        :
                        <>
                            <UserPlus className="size-3.5"/>
                            {isViewingOwnProfile ? "Follow Back" : "Follow"}
                        </>
            }
        </Button>
    );
}
