import {useId} from "react";
import {getThemeColor} from "@/lib/client/theme";
import {Progress} from "@/lib/client/components/ui/progress";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {useContinueMediaMutation} from "@/lib/client/react-query/query-mutations/continue.mutations";
import {MediaCard, MediaCardFooter, MediaCardLeftCorner, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const ContinueCard = ({ item, compact = false, readOnly = false }: { item: ContinueItem; compact?: boolean; readOnly?: boolean }) => {
    const titleId = useId();
    const config = getMediaConfig(item.mediaType).continue;
    const update = useContinueMediaMutation(item);

    const progress = config.getProgress(item);
    const updatedAt = item.lastUpdated ?? item.addedAt;

    return (
        <MediaCard item={item} mediaType={item.mediaType} aria-labelledby={titleId} className="h-auto">
            <MediaCardLeftCorner>
                <MediaTypeIcon mediaType={item.mediaType}/>
                <MediaTypeText mediaType={item.mediaType}/>
            </MediaCardLeftCorner>
            <MediaCardFooter className="via-black/85 via-70%">
                <MediaCardTitle id={titleId} title={item.mediaName} lines={1}>
                    {item.mediaName}
                </MediaCardTitle>
                <div className="flex min-h-7.5 flex-col justify-end gap-2" aria-live="polite" aria-atomic="true">
                    <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                        <span>{progress.label}</span>
                        {!compact && progress.total !== null && progress.total > 0 &&
                            <span className="shrink-0 text-muted-foreground">
                                {Math.min(100, Math.round(progress.value / progress.total * 100))}%
                            </span>
                        }
                    </div>
                    {progress.total !== null && progress.total > 0 &&
                        <Progress
                            max={progress.total}
                            color={getThemeColor(item.mediaType)}
                            aria-label={`${item.mediaName} progress`}
                            value={Math.min(progress.value, progress.total)}
                        />
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
