import {useId} from "react";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {ContinueAction} from "@/lib/client/components/continue/ContinueAction";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {MediaCard, MediaCardFooter, MediaCardRightCorner, MediaCardStatus, MediaCardTitle, MediaCardType} from "@/lib/client/components/media/base/MediaCard";


export const ContinueCard = ({ item, readOnly = false }: { item: ContinueItem; readOnly?: boolean }) => {
    const titleId = useId();
    const definition = getMediaDefinition(item.mediaType);
    const config = getMediaConfig(item.mediaType).continue;

    const unit = definition.progress.unit;
    const progress = config.getProgress(item);

    const remaining = item.mediaType !== MediaType.GAMES && progress.total !== null
        ? Math.max(0, progress.total - progress.value)
        : null;

    const remainingLabel = remaining === null ? null : `${remaining} ${remaining === 1 ? unit.singular : unit.plural} left`;

    return (
        <MediaCard item={item} mediaType={item.mediaType} aria-labelledby={titleId}>
            <MediaCardType mediaType={item.mediaType}/>
            {definition.continue.getUpdate(item)?.type === UpdateType.STATUS &&
                <MediaCardStatus title="Ready to mark completed">
                    Complete
                </MediaCardStatus>
            }
            {!readOnly &&
                <MediaCardRightCorner>
                    <ContinueAction item={item}/>
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
                            <span aria-hidden="true">· </span>{remaining} left
                        </span>
                    }
                </div>
            </MediaCardFooter>
        </MediaCard>
    );
};
