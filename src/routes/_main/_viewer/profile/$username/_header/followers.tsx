import {UserX} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {toast} from "@/lib/client/components/ui/toast";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {PrivacyType, SocialState} from "@/lib/utils/enums";
import {paginationSchema} from "@/lib/schemas/common.schema";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {followersOptions} from "@/lib/client/react-query/query-options";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {FollowButton} from "@/lib/client/components/user-profile/FollowButton";
import {useRemoveFollowerMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/followers")({
    validateSearch: paginationSchema,
    loaderDeps: ({ search: { page } }) => ({ page }),
    context: ({ params: { username }, deps: { page } }) => ({
        followersQueryOptions: followersOptions(username, page),
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.followersQueryOptions, staleTime: "static" });
    },
    component: ProfileFollowers,
    head: () => ({ meta: [{ title: "Followers - MyLists" }] }),
});


function ProfileFollowers() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { username: profileOwner } = Route.useParams();
    const { followersQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(followersQueryOptions).data;

    const isViewingOwnProfile = currentUser?.name === profileOwner;
    return (
        <div className="flex flex-col mx-auto mb-8 pt-6">
            <header>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    Followers
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isViewingOwnProfile ? "People who subscribe to your updates." : `People following ${profileOwner}`}
                </p>
            </header>
            <div className="mt-6">
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

                <Pagination
                    currentPage={apiData.pagination.page}
                    totalPages={apiData.pagination.totalPages}
                    onChangePage={page => void navigate({ search: prev => ({ ...prev, page }) })}
                />

                {apiData.followers.length === 0 &&
                    <div className="flex flex-col items-center justify-center pt-20 text-center">
                        <EmptyState icon={UserX} message="No Followers Found."/>
                    </div>
                }
            </div>
        </div>
    );
}


interface FollowerCardProps {
    profileOwner: string;
    currentUserName?: string;
    isViewingOwnProfile: boolean;
    follower: {
        id: number;
        username: string;
        privacy: PrivacyType;
        image: string | null;
        myFollowStatus: SocialState | null;
    };
}


function FollowerCard({ follower, currentUserName, profileOwner, isViewingOwnProfile }: FollowerCardProps) {
    const confirm = useConfirm();
    const isMe = currentUserName === follower.username;
    const removeMutation = useRemoveFollowerMutation(profileOwner);

    const handleRemoveFollower = async () => {
        if (!await confirm({
            confirmLabel: "Remove",
            variant: "destructive",
            title: "Remove Follower?",
            description: <span><b>{follower.username}</b> will no longer follow you.</span>,
        })) return;

        removeMutation.mutate({ data: { followerId: follower.id } }, {
            onSuccess: () => toast.add({ title: "Follower removed!", type: "success" }),
        });
    };

    return (
        <div className="flex flex-col justify-between rounded-xl border p-4">
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
                            className="absolute -bottom-1 -right-1 rounded-full border bg-background p-0.5"
                        >
                            <div className="rounded-full bg-background p-0.5">
                                <PrivacyIcon type={follower.privacy}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Link to="/profile/$username" params={{ username: follower.username }}>
                            <h3 className="font-medium leading-none text-foreground hover:text-brand">
                                {follower.username}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
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
                                <FollowButton
                                    targetUserId={follower.id}
                                    profileUsername={profileOwner}
                                    className="w-auto flex-1 font-medium"
                                    followStatus={follower.myFollowStatus}
                                    followLabel={isViewingOwnProfile ? "Follow Back" : "Follow"}
                                />
                                {isViewingOwnProfile &&
                                    <LoadingButton
                                        size="icon"
                                        variant="outline"
                                        title="Remove Follower"
                                        onClick={handleRemoveFollower}
                                        icon={<UserX className="size-4"/>}
                                        isLoading={removeMutation.isPending}
                                        className="shrink-0 hover:border-transparent hover:bg-destructive/30 hover:text-foreground"
                                    />
                                }
                            </div>
                        }
                    </>
                }
            </div>
        </div>
    );
}
