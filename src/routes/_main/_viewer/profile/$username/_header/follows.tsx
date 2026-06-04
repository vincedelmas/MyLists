import {toast} from "sonner";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute, Link} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Clock, Loader2, UserCheck, UserPlus, UserX} from "lucide-react";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {followsOptions} from "@/lib/client/react-query/query-options";
import {useFollowMutation, useUnfollowMutation,} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/follows")({
    loader: ({ context: { queryClient }, params: { username } }) => {
        return queryClient.ensureQueryData(followsOptions(username));
    },
    component: ProfileFollows,
});


function ProfileFollows() {
    const { currentUser } = useAuth();
    const { username: profileOwner } = Route.useParams();
    const isViewingOwnProfile = currentUser?.name === profileOwner;
    const apiData = useSuspenseQuery(followsOptions(profileOwner)).data;

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
                        currentUserName={currentUser?.name}
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
    follow: {
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


function FollowCard({ follow, currentUserName, profileOwner, isViewingOwnProfile }: FollowCardProps) {
    const isMe = currentUserName === follow.username;

    return (
        <div className="bg-background flex flex-col justify-between rounded-xl border p-4">
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
                            <div className="bg-background rounded-full p-0.5">
                                <PrivacyIcon type={follow.privacy}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Link to="/profile/$username" params={{ username: follow.username }}>
                            <h3 className="text-primary hover:text-app-accent font-medium leading-none">
                                {follow.username}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                            {follow.privacy} Profile
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
                            <Button variant="secondary" className="flex-1" disabled>
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
            onError: () => toast.error("Sorry, an error occurred...")
        });
    };

    const variant = followStatus === SocialState.ACCEPTED ? "emeraldy"
        : followStatus === SocialState.REQUESTED ? "secondary" : "outline";

    const hoverClass = followStatus ? "hover:border-destructive/50 hover:bg-destructive/40 hover:text-primary" : "";

    return (
        <Button
            variant={variant}
            disabled={isPending}
            onClick={handleClick}
            className={`group flex-1 font-bold transition-all ${hoverClass}`}
        >
            {isPending ?
                <Loader2 className="size-3.5 animate-spin"/>
                : followStatus === SocialState.ACCEPTED ?
                    <>
                        <span className="flex items-center gap-2 group-hover:hidden">
                            <UserCheck className="size-3.5"/> Following
                        </span>
                        <span className="hidden items-center gap-2 group-hover:flex">
                            <UserX className="size-3.5"/> Unfollow
                        </span>
                    </>
                    : followStatus === SocialState.REQUESTED ?
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
