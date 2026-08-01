import {useState} from "react";
import {Activity} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {UserUpdateType} from "@/lib/types/query.options.types";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {UserUpdate} from "@/lib/client/components/general/UserUpdate";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {useDeleteProfileUpdateMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserUpdatesProps {
    username: string;
    updates: (UserUpdateType & { username?: string | null })[];
}


export const UserUpdates = ({ username, updates }: UserUpdatesProps) => {
    const { currentUser } = useAuth();
    const deleteUpdatesMutation = useDeleteProfileUpdateMutation(username);
    const [mediaIdBeingDeleted, setMediaIdBeingDeleted] = useState<undefined | number>();

    const deleteUpdate = (updateId: number) => {
        setMediaIdBeingDeleted(updateId);
        deleteUpdatesMutation.mutate({ data: { updateIds: [updateId], returnData: true } });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {updates.length === 0 ?
                    <EmptyState
                        icon={Activity}
                        className="py-4"
                        message="No recent feed found."
                    />
                    :
                    <div className="flex flex-col gap-1">
                        {updates.map((update) =>
                            <UserUpdate
                                key={update.id}
                                update={update}
                                onDelete={deleteUpdate}
                                mediaIdBeingDeleted={mediaIdBeingDeleted}
                                isPending={deleteUpdatesMutation.isPending}
                                canDelete={(currentUser?.id === update.userId)}
                            />
                        )}
                    </div>
                }
                {updates.length !== 0 &&
                    <Link params={{ username }} to="/profile/$username/history" className={cn(buttonVariants({ variant: "dashed" }))}>
                        View all Feed
                    </Link>
                }
            </CardContent>
        </Card>
    );
};


export const FollowsUpdates = ({ username: _username, updates }: UserUpdatesProps) => {
    return (
        <Card className={cn("h-120", updates.length === 0 && "h-fit")}>
            <CardHeader>
                <CardTitle>
                    Follows Recent Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto scrollbar-thin">
                <div className="pr-2">
                    {updates.length === 0 ?
                        <EmptyState
                            icon={Activity}
                            message="No follows feed found."
                        />
                        :
                        <div className="flex flex-col gap-1 ">
                            {updates.map((update) =>
                                <UserUpdate
                                    key={update.id}
                                    update={update}
                                    canDelete={false}
                                    username={update.username}
                                />
                            )}
                        </div>
                    }
                </div>
            </CardContent>
        </Card>
    );
};
