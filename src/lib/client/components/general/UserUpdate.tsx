import {Trash} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {UserUpdateType} from "@/lib/types/query.options.types";
import {Payload} from "@/lib/client/components/general/Payload";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";


interface UserUpdateProps {
    canDelete: boolean;
    isPending?: boolean;
    update: UserUpdateType;
    username?: string | null;
    mediaIdBeingDeleted?: number;
    onDelete?: (updateId: number) => void;
}


export function UserUpdate({ update, username, onDelete, canDelete, isPending, mediaIdBeingDeleted }: UserUpdateProps) {
    const handleDeleteUpdate = (updateId: number) => {
        if (!window.confirm("This update will be definitively deleted, are you sure?")) return;
        onDelete?.(updateId);
    };

    return (
        <div className={cn("relative group flex gap-3 py-3 px-2 border-b hover:bg-muted/30 rounded-lg",
            (mediaIdBeingDeleted === update.id && isPending) && "opacity-30")}>
            <div className="mt-0.5">
                <div className="flex items-center justify-center">
                    <MainThemeIcon
                        type={update.mediaType}
                        className="size-4 mt-0.5"
                    />
                </div>
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <p className="text-sm">
                        <Link
                            disabled={isPending}
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: update.mediaType, mediaId: update.mediaId }}
                        >
                             <span title={update.mediaName} className="font-medium text-foreground line-clamp-1 hover:text-app-accent">
                                {update.mediaName}
                            </span>
                        </Link>
                    </p>
                    <RelativeTime
                        date={update.timestamp}
                        className="ml-2 whitespace-nowrap text-xs text-muted-foreground"
                    />
                </div>
                <div className="flex justify-between">
                    <Payload
                        update={update}
                        username={username}
                    />
                </div>
            </div>
            {canDelete &&
                <Button
                    variant="invisible"
                    disabled={isPending}
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-80 disabled:opacity-0 disabled:pointer-events-none"
                >
                    <Trash className="size-4"/>
                </Button>
            }
        </div>
    );
}
