import {toast} from "sonner";
import {cn} from "@/lib/utils/classnames";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {createFileRoute, Link} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Clock, Loader2, UserCheck, UserPlus, UserX} from "lucide-react";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {followersOptions} from "@/lib/client/react-query/query-options";
import {useFollowMutation, useRemoveFollowerMutation, useUnfollowMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/followers")({
    loader: ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(followersOptions(username));
    },
    component: ProfileFollowers,
});


function ProfileFollowers() {
    const { currentUser } = useAuth();
    const { username: profileOwner } = Route.useParams();
    const isViewingOwnProfile = currentUser?.name === profileOwner;
    const apiData = useSuspenseQuery(followersOptions(profileOwner)).data;

    return (
        <PageTitle
            title="Followers"
            subtitle={isViewingOwnProfile ? "People who subscribe to your updates." : `People following ${profileOwner}`}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {apiData.followers.map((follower) =>
                    <FollowerCard
                        key={follower.id}
                        follower={follower}
                        profileOwner={profileOwner}
                        currentUserName={currentUser?.name}
                        isViewingOwnProfile={isViewingOwnProfile}
                    />
                )}
            </div>

            {apiData.followers.length === 0 &&
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                    <EmptyState icon={UserX} message="No Followers Found."/>
                </div>
            }
        </PageTitle>
    );
}


interface FollowerCardProps {
    follower: {
        id: number;
        username: string;
        privacy: PrivacyType;
        image: string | null;
        myFollowStatus: SocialState | null;
    };
    profileOwner: string;
    currentUserName?: string;
    isViewingOwnProfile: boolean;
}


function FollowerCard({ follower, currentUserName, profileOwner, isViewingOwnProfile }: FollowerCardProps) {
    const isMe = currentUserName === follower.username;
    const removeMutation = useRemoveFollowerMutation(profileOwner);

    const handleRemoveFollower = () => {
        if (window.confirm(`Are you sure you want to remove ${follower.username} from your followers?`)) {
            removeMutation.mutate({ data: { followerId: follower.id } }, {
                onSuccess: () => toast.success("Follower removed!"),
            });
        }
    };

    return (
        <div className="bg-background flex flex-col justify-between rounded-xl border p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ProfileIcon
                            className="size-13"
                            fallbackSize="text-lg"
                            user={{ name: follower.username, image: follower.image }}
                        />
                        <div
                            title={`Privacy: ${follower.privacy}`}
                            className="bg-background absolute -bottom-1 -right-1 rounded-full border p-0.5"
                        >
                            <div className="bg-background rounded-full p-0.5">
                                <PrivacyIcon type={follower.privacy}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Link to="/profile/$username" params={{ username: follower.username }}>
                            <h3 className="text-primary hover:text-app-accent font-medium leading-none">
                                {follower.username}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                            {follower.privacy} Profile
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex gap-2">
                {!currentUserName &&
                    <Button variant="outline" className="flex-1" disabled>
                        Log-In to Follow
                    </Button>
                }

                {currentUserName &&
                    <>
                        {isMe ?
                            <Button variant="secondary" className="flex-1" disabled={true}>
                                You
                            </Button>
                            :
                            <div className="flex w-full gap-2">
                                <FollowerActionButton
                                    followerId={follower.id}
                                    profileOwner={profileOwner}
                                    followStatus={follower.myFollowStatus}
                                    isViewingOwnProfile={isViewingOwnProfile}
                                />
                                {isViewingOwnProfile &&
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        title="Remove Follower"
                                        onClick={handleRemoveFollower}
                                        disabled={removeMutation.isPending}
                                        className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    >
                                        {removeMutation.isPending ?
                                            <Loader2 className="size-4 animate-spin"/> : <UserX className="size-4"/>
                                        }
                                    </Button>
                                }
                            </div>
                        }
                    </>
                }
            </div>
        </div>
    );
}


interface FollowerActionButtonProps {
    followerId: number;
    profileOwner: string;
    isViewingOwnProfile: boolean;
    followStatus: SocialState | null;
}


function FollowerActionButton({ followerId, followStatus, profileOwner, isViewingOwnProfile }: FollowerActionButtonProps) {
    const followMutation = useFollowMutation(profileOwner);
    const unfollowMutation = useUnfollowMutation(profileOwner);
    const isPending = followMutation.isPending || unfollowMutation.isPending;

    const isFollowing = followStatus === SocialState.ACCEPTED;
    const isRequested = followStatus === SocialState.REQUESTED;
    const shouldUnfollow = isFollowing || isRequested;

    const handleClick = () => {
        const mutation = shouldUnfollow ? unfollowMutation : followMutation;

        mutation.mutate({ data: { targetUserId: followerId } }, {
            onError: () => toast.error("Sorry, an error occurred..."),
        });
    };

    return (
        <Button
            disabled={isPending}
            onClick={handleClick}
            variant={isFollowing ? "emeraldy" : isRequested ? "secondary" : "outline"}
            className={cn("group flex-1 font-bold transition-all", shouldUnfollow &&
                "hover:border-destructive/50 hover:bg-destructive/40 hover:text-primary"
            )}
        >
            {isPending ?
                <Loader2 className="size-3.5 animate-spin"/>
                : isFollowing ?
                    <>
                        <span className="flex items-center gap-2 group-hover:hidden">
                            <UserCheck className="size-3.5"/> Following
                        </span>
                        <span className="hidden items-center gap-2 group-hover:flex">
                            <UserX className="size-3.5"/> Unfollow
                        </span>
                    </>
                    : isRequested ?
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
