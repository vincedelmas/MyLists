import {useId} from "react";
import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/client/theme";
import {Badge} from "@/lib/client/components/ui/badge";
import {Progress} from "@/lib/client/components/ui/progress";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {useContinueMediaMutation} from "@/lib/client/react-query/query-mutations/continue.mutations";
import {MediaCard, MediaCardFooter, MediaCardLeftCorner, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const ContinueCard = ({ item, compact = false, readOnly = false }: { item: ContinueItem; compact?: boolean; readOnly?: boolean }) => {
    const titleId = useId();
    const update = useContinueMediaMutation(item);
    const config = getMediaConfig(item.mediaType).continue;
    const unit = getMediaDefinition(item.mediaType).progress.unit;

    const progress = config.getProgress(item);
    const updatedAt = item.lastUpdated ?? item.addedAt;

    const remaining = item.mediaType !== MediaType.GAMES && progress.total !== null
        ? Math.max(0, progress.total - progress.value)
        : null;

    return (
        <MediaCard item={item} mediaType={item.mediaType} aria-labelledby={titleId} className="h-auto">
            <MediaCardLeftCorner>
                <MediaTypeIcon mediaType={item.mediaType}/>
                <MediaTypeText mediaType={item.mediaType}/>
            </MediaCardLeftCorner>
            {remaining !== null &&
                <Badge
                    variant="overlay"
                    aria-label={`${remaining} ${remaining === 1 ? unit.singular : unit.plural} left`}
                    className="pointer-events-none absolute right-1.5 top-1.5 h-4 px-1.5 text-[10px] tabular-nums
                    @min-[128px]/media-card:right-2 @min-[128px]/media-card:top-2 @min-[128px]/media-card:h-5
                    @min-[128px]/media-card:px-2 @min-[128px]/media-card:text-xs
                    @min-[250px]/media-card:right-3 @min-[250px]/media-card:top-3"
                >
                    {remaining} left
                </Badge>
            }
            <MediaCardFooter className="via-black/85 via-70%">
                <MediaCardTitle id={titleId} title={item.mediaName} lines={1}>
                    {item.mediaName}
                </MediaCardTitle>
                <div className="flex min-h-7.5 flex-col justify-end gap-2" aria-live="polite" aria-atomic="true">
                    <span className="min-w-0 truncate text-xs tabular-nums">
                        {progress.label}
                    </span>
                    {progress.total !== null && progress.total > 0 ?
                        <Progress
                            max={progress.total}
                            color={getThemeColor(item.mediaType)}
                            aria-label={`${item.mediaName} progress`}
                            className="**:data-[slot=progress-track]:h-1"
                            value={Math.min(progress.value, progress.total)}
                        />
                        :
                        <div aria-hidden="true" className="h-1"/>
                    }
                </div>
                {!compact && (updatedAt ?
                        <RelativeTime
                            date={updatedAt}
                            prefix="Updated "
                            formatOptions={{ style: "long" }}
                            className="pointer-events-auto text-xs"
                        />
                        :
                        <span className="text-xs">
                            Ready to continue
                        </span>
                )}
                {!readOnly &&
                    <div className="pointer-events-auto flex items-center gap-2 pt-1">
                        <LoadingButton
                            size="xs"
                            disabled={!progress.update}
                            isLoading={update.isPending}
                            onClick={() => update.mutate()}
                            className="min-h-7 min-w-0 flex-1 sm:min-h-6"
                        >
                            <span className="truncate">
                                {progress.actionLabel}
                            </span>
                        </LoadingButton>
                    </div>
                }
            </MediaCardFooter>
        </MediaCard>
    );
};
