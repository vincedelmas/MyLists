import {cn} from "@/lib/utils/classnames";
import {SocialState} from "@/lib/utils/enums";
import {Clock, UserCheck, UserPlus, UserX} from "lucide-react";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {useFollowMutation, useUnfollowMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


type FollowAction = "follow" | "unfollow";


interface FollowButtonProps {
    className?: string;
    targetUserId: number;
    followLabel?: string;
    profileUsername: string;
    followStatus?: SocialState | null;
}


const getButtonConfig = (status: SocialState | null | undefined, followLabel: string) => {
    switch (status) {
        case SocialState.ACCEPTED:
            return {
                Icon: UserCheck,
                HoverIcon: UserX,
                label: "Following",
                hoverLabel: "Unfollow",
                variant: "default" as const,
                action: "unfollow" as FollowAction,
                className: "hover:bg-destructive/40 hover:text-foreground",
            };
        case SocialState.REQUESTED:
            return {
                Icon: Clock,
                HoverIcon: UserX,
                label: "Requested",
                hoverLabel: "Cancel",
                variant: "secondary" as const,
                action: "unfollow" as FollowAction,
                className: "hover:bg-destructive/40 hover:text-foreground",
            };
        default:
            return {
                className: "",
                Icon: UserPlus,
                HoverIcon: null,
                hoverLabel: null,
                label: followLabel,
                variant: "outline" as const,
                action: "follow" as FollowAction,
            };
    }
};


export const FollowButton = ({ targetUserId, followStatus, profileUsername, followLabel = "Follow", className }: FollowButtonProps) => {
    const followMutation = useFollowMutation(profileUsername);
    const config = getButtonConfig(followStatus, followLabel);

    const unfollowMutation = useUnfollowMutation(profileUsername);
    const isPending = followMutation.isPending || unfollowMutation.isPending;

    const handleClick = () => {
        const mutation = (config.action === "follow") ? followMutation : unfollowMutation;
        mutation.mutate({ data: { targetUserId } });
    };

    return (
        <LoadingButton
            isLoading={isPending}
            onClick={handleClick}
            variant={config.variant}
            aria-label={isPending ? "Updating follow status" : undefined}
            className={cn("group w-30 font-bold transition-all", config.className, className)}
        >
            {!isPending &&
                <>
                    <span className={cn("flex items-center gap-2", config.hoverLabel && "group-hover:hidden")}>
                        <config.Icon className="size-3.5"/>
                        {config.label}
                    </span>
                    {config.hoverLabel &&
                        <span className="hidden items-center gap-2 group-hover:flex">
                            {config.HoverIcon && <config.HoverIcon className="size-3.5"/>}
                            {config.hoverLabel}
                        </span>
                    }
                </>
            }
        </LoadingButton>
    );
};
