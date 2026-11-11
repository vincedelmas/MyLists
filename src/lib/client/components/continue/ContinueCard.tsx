import {useId} from "react";
import {Plus} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {useContinueMediaMutation} from "@/lib/client/react-query/query-mutations/continue.mutations";
import {MediaCard, MediaCardBadge, MediaCardFooter, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const ContinueCard = ({ item, readOnly = false }: { item: ContinueItem; readOnly?: boolean }) => {
    const titleId = useId();
    const update = useContinueMediaMutation(item);
    const config = getMediaConfig(item.mediaType).continue;
    const unit = getMediaDefinition(item.mediaType).progress.unit;

    const progress = config.getProgress(item);

    const remaining = item.mediaType !== MediaType.GAMES && progress.total !== null
        ? Math.max(0, progress.total - progress.value)
        : null;

    return (
        <MediaCard item={item} mediaType={item.mediaType} aria-labelledby={titleId}>
            <MediaCardBadge>
                <MediaTypeIcon mediaType={item.mediaType}/>
                <MediaTypeText mediaType={item.mediaType}/>
            </MediaCardBadge>
            {remaining !== null &&
                <Badge
                    variant="overlay"
                    aria-label={`${remaining} ${remaining === 1 ? unit.singular : unit.plural} left`}
                    className="pointer-events-none absolute right-1.5 top-1.5 h-5 px-2 text-[11px] tabular-nums"
                >
                    {remaining} left
                </Badge>
            }
            <MediaCardFooter>
                <div className="flex min-w-0 items-center gap-1.5">
                    <MediaCardTitle id={titleId} title={item.mediaName} className="flex-1 tracking-tight">
                        {item.mediaName}
                    </MediaCardTitle>
                    {!readOnly &&
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <LoadingButton
                                        size="icon-xs"
                                        icon={<Plus/>}
                                        variant="outline"
                                        disabled={!progress.update}
                                        isLoading={update.isPending}
                                        onClick={() => update.mutate()}
                                        aria-label={`${progress.actionLabel} · ${item.mediaName}`}
                                        className="pointer-events-auto text-muted-foreground max-sm:size-7"
                                    />
                                }
                            />
                            <TooltipContent>
                                {progress.actionLabel}
                            </TooltipContent>
                        </Tooltip>
                    }
                </div>
                <span
                    aria-live="polite"
                    aria-atomic="true"
                    title={progress.label}
                    className="pointer-events-auto min-w-0 truncate text-xs tabular-nums text-muted-foreground"
                >
                    {progress.label}
                </span>
            </MediaCardFooter>
        </MediaCard>
    );
};
