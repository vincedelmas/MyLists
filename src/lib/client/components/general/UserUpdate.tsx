import {Trash} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {UserUpdateType} from "@/lib/types/query.options.types";
import {Payload} from "@/lib/client/components/general/Payload";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";


interface UserUpdateProps {
    canDelete: boolean;
    isPending?: boolean;
    update: UserUpdateType;
    username?: string | null;
    mediaIdBeingDeleted?: number;
    onDelete?: (updateId: number) => void;
}


export function UserUpdate({ update, username, onDelete, canDelete, isPending, mediaIdBeingDeleted }: UserUpdateProps) {
    const confirm = useConfirm();

    const handleDeleteUpdate = async (updateId: number) => {
        if (!await confirm({
            variant: "destructive",
            title: "Delete this update?",
            confirmLabel: "Delete update",
            description: "This update will be permanently deleted.",
        })) return;

        onDelete?.(updateId);
    };

    return (
        <div className="relative group flex gap-3 py-3 px-2 border-b hover:bg-muted/30 rounded-lg">
            <div className="mt-1">
                <div className="flex items-center justify-center">
                    <MainThemeIcon
                        className="size-4"
                        type={update.mediaType}
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
                             <span title={update.mediaName} className="font-medium text-foreground line-clamp-1 hover:text-brand">
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
                <LoadingButton
                    size="icon"
                    variant="ghost"
                    aria-label="Delete update"
                    icon={<Trash className="size-4"/>}
                    onClick={() => handleDeleteUpdate(update.id)}
                    disabled={isPending && mediaIdBeingDeleted !== update.id}
                    isLoading={isPending && mediaIdBeingDeleted === update.id}
                    className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-80 aria-busy:opacity-100"
                />
            }
        </div>
    );
}
