import {UserRoundX} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {UserFollowsType} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface ProfileFollowsProps {
    username: string;
    followsCount: number;
    follows: UserFollowsType;
}


export const ProfileFollows = ({ username, followsCount, follows }: ProfileFollowsProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Follows
                </CardTitle>
                <CardAction className="text-xs text-muted-foreground mt-1.5">
                    {followsCount} Users
                </CardAction>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-3">
                    {followsCount === 0 ?
                        <EmptyState
                            icon={UserRoundX}
                            className="col-span-4 py-2"
                            message="No follows added yet."
                        />
                        :
                        follows.follows.map((follow) =>
                            <div key={follow.id} className="flex flex-col items-center group">
                                <div className="group-hover:border-app-accent">
                                    <Tooltip key={follow.id}>
                                        <TooltipTrigger asChild>
                                            <Link key={follow.username} to="/profile/$username" params={{ username: follow.username }}>
                                                <ProfileIcon
                                                    fallbackSize="text-lg"
                                                    user={{ image: follow.image, name: follow.username }}
                                                    className="size-12 border-none hover:ring-2 hover:ring-app-accent"
                                                />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {follow.username}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        )}
                </div>

                {followsCount > 0 &&
                    <Button className="mt-4" variant="dashed" asChild>
                        <Link to="/profile/$username/follows" params={{ username }}>
                            View all {followsCount} follows
                        </Link>
                    </Button>
                }
            </CardContent>
        </Card>
    );
};
