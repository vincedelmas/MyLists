import {ArrowUp} from "lucide-react";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {useContinueMediaMutation} from "@/lib/client/react-query/query-mutations/continue.mutations";


export const ContinueAction = ({ item, showLabel = false }: { item: ContinueItem; showLabel?: boolean }) => {
    const update = useContinueMediaMutation(item);
    const progress = getMediaConfig(item.mediaType).continue.getProgress(item);

    const button = (
        <LoadingButton
            icon={<ArrowUp/>}
            disabled={!progress.update}
            isLoading={update.isPending}
            size={showLabel ? "sm" : "bare"}
            onClick={() => update.mutate()}
            variant={showLabel ? "outline" : "ghost"}
            className={showLabel ? "w-30 justify-start" : undefined}
            aria-label={`${progress.actionLabel} · ${item.mediaName}`}
        >
            {showLabel &&
                <span className="min-w-0 truncate">
                    {progress.actionLabel}
                </span>
            }
        </LoadingButton>
    );

    if (showLabel) return button;

    return (
        <Tooltip>
            <TooltipTrigger render={button}/>
            <TooltipContent>
                {progress.actionLabel}
            </TooltipContent>
        </Tooltip>
    );
};
