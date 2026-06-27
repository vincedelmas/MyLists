import {cn} from "@/lib/utils/classnames";
import {SocialState} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Clock, Loader2, UserCheck, UserPlus, UserX} from "lucide-react";
import {ProfileHeaderOptionsType} from "@/lib/types/query.options.types";
import {useFollowMutation, useUnfollowMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


interface FollowButtonProps {
    className?: string;
    profileUsername: string;
    social: {
        followId: ProfileHeaderOptionsType["social"]["followId"];
        followStatus?: Pick<NonNullable<ProfileHeaderOptionsType["social"]["followStatus"]>, "status"> | null;
    };
}


type FollowAction = "follow" | "unfollow";


const getButtonConfig = (status?: SocialState) => {
    switch (status) {
        case SocialState.ACCEPTED:
            return {
                Icon: UserCheck,
                HoverIcon: UserX,
                label: "Following",
                hoverLabel: "Unfollow",
                variant: "emeraldy" as const,
                action: "unfollow" as FollowAction,
                className: "hover:bg-destructive/40 hover:text-primary hover:border-destructive/50",
            };
        case SocialState.REQUESTED:
            return {
                Icon: Clock,
                HoverIcon: UserX,
                label: "Requested",
                hoverLabel: "Cancel",
                variant: "secondary" as const,
                action: "unfollow" as FollowAction,
                className: "hover:bg-destructive/40 hover:text-primary hover:border-destructive/50",
            };
        default:
            return {
                className: "",
                Icon: UserPlus,
                HoverIcon: null,
                label: "Follow",
                hoverLabel: null,
                variant: "outline" as const,
                action: "follow" as FollowAction,
            };
    }
};


export const FollowButton = ({ profileUsername, social, className }: FollowButtonProps) => {
    const followMutation = useFollowMutation(profileUsername);
    const config = getButtonConfig(social.followStatus?.status);
    const unfollowMutation = useUnfollowMutation(profileUsername);
    const isPending = followMutation.isPending || unfollowMutation.isPending;

    const handleClick = () => {
        const mutation = (config.action === "follow") ? followMutation : unfollowMutation;
        mutation.mutate({ data: { targetUserId: social.followId } });
    };

    return (
        <Button
            disabled={isPending}
            onClick={handleClick}
            variant={config.variant}
            className={cn("group w-30 font-bold transition-all", config.className, className)}
        >
            {isPending
                ? <Loader2 className="size-3.5 animate-spin"/>
                : <>
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
        </Button>
    );
};
