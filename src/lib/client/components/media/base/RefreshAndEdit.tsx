import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Pencil, RefreshCw} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {isAtLeastRole, MediaType, RoleType} from "@/lib/utils/enums";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useRefreshMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";


interface RefreshAndEditProps {
    mediaId: number;
    mediaType: MediaType;
    lastUpdate: string | null;
}


export const RefreshAndEdit = ({ mediaType, mediaId, lastUpdate }: RefreshAndEditProps) => {
    const { currentUser } = useAuth();
    const isBook = (mediaType === MediaType.BOOKS);
    const refreshMutation = useRefreshMediaMutation(mediaType, mediaId);
    const lastUpdateDate = lastUpdate ? dateFromUTCInput(lastUpdate) : null;
    const isManagerOrAbove = isAtLeastRole(currentUser?.role, RoleType.MANAGER);

    if (!isManagerOrAbove && isBook) return null;

    // Logic Constants
    const isLastUpdateValid = lastUpdateDate && !isNaN(lastUpdateDate.getTime());
    const nextRefreshAt = isLastUpdateValid ? new Date(lastUpdateDate.getTime() + 24 * 60 * 60 * 1000) : null;

    // Managers can refresh anything. Others can refresh anything except books.
    const canRefreshThisType = isManagerOrAbove || !isBook;

    // Cooldown only applies to users below MANAGER
    const isRefreshCooldown = !isManagerOrAbove && !!nextRefreshAt && Date.now() < nextRefreshAt.getTime();

    // Check availability of refresh
    const refreshDisabled = refreshMutation.isPending || !currentUser || isRefreshCooldown;

    const handleRefresh = () => {
        refreshMutation.mutate({ data: { mediaId, mediaType } });
    };

    return (
        <div className="flex items-center justify-center gap-4 rounded-lg border p-1 shadow-sm max-sm:gap-2">
            {canRefreshThisType &&
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRefresh}
                    disabled={refreshDisabled}
                    className="h-8 gap-2 px-3 text-xs"
                >
                    <RefreshCw className={cn("size-3.5", refreshMutation.isPending && "animate-spin")}/> Refresh
                </Button>
            }

            {canRefreshThisType && isManagerOrAbove &&
                <div className="h-6 border-l border border-muted-foreground/50"/>
            }

            {isManagerOrAbove &&
                <Button size="sm" variant="ghost" className="h-8 gap-2 px-3 text-xs" asChild>
                    <Link to="/details/edit/$mediaType/$mediaId" params={{ mediaType, mediaId }}>
                        <Pencil className="size-3.5"/> Edit
                    </Link>
                </Button>
            }

            {(canRefreshThisType || isManagerOrAbove) &&
                <div className="h-6 border-l border border-muted-foreground/50"/>
            }

            <RelativeTime
                prefix="Updated "
                date={lastUpdate}
                className="px-3 text-xs text-muted-foreground"
            />
        </div>
    );
};
