import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Pencil, RefreshCw} from "lucide-react";
import {mediaConfig} from "../media-config";
import {Separator} from "@/lib/client/components/ui/separator";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useNow} from "@/lib/client/hooks/use-dates";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useRefreshMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";


interface RefreshAndEditProps {
    mediaId: number;
    mediaType: MediaType;
    lastUpdate: string | null;
    canRefresh: boolean;
}


export const RefreshAndEdit = ({ mediaType, mediaId, lastUpdate, canRefresh }: RefreshAndEditProps) => {
    const now = useNow(10_000);
    const { currentUser } = useAuth();
    const CatalogueActions = mediaConfig[mediaType].catalogueActions;
    const refreshMutation = useRefreshMediaMutation(mediaType, mediaId);
    const lastUpdateDate = lastUpdate ? dateFromUTCInput(lastUpdate) : null;
    const isManagerOrAbove = currentUser?.capabilities.editCatalog ?? false;

    if (!isManagerOrAbove && !canRefresh) return null;

    // Logic Constants
    const isLastUpdateValid = lastUpdateDate && !isNaN(lastUpdateDate.getTime());
    const nextRefreshAt = isLastUpdateValid ? new Date(lastUpdateDate.getTime() + 24 * 60 * 60 * 1000) : null;

    // Cooldown only applies to users below MANAGER
    const isRefreshCooldown = !isManagerOrAbove && !!nextRefreshAt && now < nextRefreshAt.getTime();

    // Check availability of refresh
    const refreshDisabled = refreshMutation.isPending || !currentUser || isRefreshCooldown;

    const handleRefresh = () => {
        refreshMutation.mutate({ data: { mediaId, mediaType } });
    };

    return (
        <div className="flex items-center justify-center gap-4 rounded-lg border p-1 shadow-sm max-sm:gap-2">
            {canRefresh &&
                <Button size="sm" variant="hover" onClick={handleRefresh} disabled={refreshDisabled}>
                    <RefreshCw className={cn(refreshMutation.isPending && "animate-spin")}/>
                    Refresh
                </Button>
            }

            {canRefresh && isManagerOrAbove &&
                <Separator orientation="vertical"/>
            }

            {isManagerOrAbove &&
                <Link
                    params={{ mediaType, mediaId }}
                    to="/details/edit/$mediaType/$mediaId"
                    className={buttonVariants({ size: "sm", variant: "hover" })}
                >
                    <Pencil data-icon="inline-start"/> Edit
                </Link>
            }

            <Separator orientation="vertical"/>

            {CatalogueActions && <CatalogueActions mediaId={mediaId}/>}
            <RelativeTime
                prefix="Updated "
                date={lastUpdate}
                className="px-3 text-xs text-muted-foreground"
            />
        </div>
    );
};
