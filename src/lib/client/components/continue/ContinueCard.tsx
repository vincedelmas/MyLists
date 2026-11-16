import {useId} from "react";
import {ArrowUp} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {useContinueMediaMutation} from "@/lib/client/react-query/query-mutations/continue.mutations";
import {MediaCard, MediaCardFooter, MediaCardRightCorner, MediaCardTitle, MediaCardType} from "@/lib/client/components/media/base/MediaCard";


export const ContinueCard = ({ item, readOnly = false }: { item: ContinueItem; readOnly?: boolean }) => {
    const titleId = useId();
    const update = useContinueMediaMutation(item);
    const config = getMediaConfig(item.mediaType).continue;
    const unit = getMediaDefinition(item.mediaType).progress.unit;

    const progress = config.getProgress(item);

    const remaining = item.mediaType !== MediaType.GAMES && progress.total !== null
        ? Math.max(0, progress.total - progress.value)
        : null;
    const remainingLabel = remaining === null ? null : `${remaining} ${remaining === 1 ? unit.singular : unit.plural} left`;

    return (
        <MediaCard item={item} mediaType={item.mediaType} aria-labelledby={titleId}>
            <MediaCardType mediaType={item.mediaType}/>
            {!readOnly &&
                <MediaCardRightCorner>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <LoadingButton
                                    size="bare"
                                    variant="ghost"
                                    icon={<ArrowUp/>}
                                    disabled={!progress.update}
                                    isLoading={update.isPending}
                                    onClick={() => update.mutate()}
                                    aria-label={`${progress.actionLabel} · ${item.mediaName}`}
                                />
                            }
                        />
                        <TooltipContent>
                            {progress.actionLabel}
                        </TooltipContent>
                    </Tooltip>
                </MediaCardRightCorner>
            }
            <MediaCardFooter>
                <MediaCardTitle id={titleId} title={item.mediaName} className="tracking-tight">
                    {item.mediaName}
                </MediaCardTitle>
                <div
                    aria-live="polite"
                    aria-atomic="true"
                    title={remainingLabel ? `${progress.label} · ${remainingLabel}` : progress.label}
                    className="pointer-events-auto flex min-w-0 items-center gap-1 text-xs tabular-nums text-muted-foreground"
                >
                    <span className="truncate">
                        {progress.label}
                    </span>
                    {remaining !== null &&
                        <span className="shrink-0 whitespace-nowrap" aria-label={remainingLabel ?? undefined}>
                            <span aria-hidden="true">· </span>{remaining} {unit.short} left
                        </span>
                    }
                </div>
            </MediaCardFooter>
        </MediaCard>
    );
};
