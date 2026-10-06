import {cn} from "@/lib/utils/classnames";
import {Badge} from "@/lib/client/components/ui/badge";
import {smartViewBadgeLabels} from "./smart-view.utils";
import {useLayoutEffect, useRef, useState} from "react";
import {Button} from "@/lib/client/components/ui/button";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger} from "@/lib/client/components/ui/popover";


interface SmartViewBadgesProps {
    compact?: boolean;
    className?: string;
    sortLabel?: string;
    spec: SmartViewSpec;
}


export const SmartViewBadges = ({ spec, compact = false, className, sortLabel }: SmartViewBadgesProps) => {
    const labels = smartViewBadgeLabels(spec, sortLabel);

    const labelsKey = JSON.stringify(labels);
    const rowRef = useRef<HTMLDivElement>(null);

    const measureRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(0);

    useLayoutEffect(() => {
        if (!compact) return;
        const row = rowRef.current!;
        const measure = measureRef.current!;

        const updateVisibleCount = () => {
            const children = [...measure.children] as HTMLElement[];
            const widths = children.slice(0, -1).map(child => child.getBoundingClientRect().width);
            const gap = parseFloat(getComputedStyle(measure).columnGap);
            const available = row.getBoundingClientRect().width;

            if (widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1) <= available) {
                setVisibleCount(widths.length);
                return;
            }

            const moreWidth = children.at(-1)!.getBoundingClientRect().width;

            let count = 0;
            let usedWidth = moreWidth;

            for (const width of widths) {
                if (usedWidth + gap + width > available) break;
                usedWidth += gap + width;
                count++;
            }

            setVisibleCount(count);
        };

        updateVisibleCount();
        const observer = new ResizeObserver(updateVisibleCount);

        observer.observe(row);
        observer.observe(measure);

        return () => observer.disconnect();
    }, [compact, labelsKey]);

    if (!compact) {
        return (
            <div className={cn("flex min-w-0 flex-wrap gap-1.5", className)} aria-label="List rules">
                {labels.map(label =>
                    <Badge key={label} variant="secondary" className="h-auto max-w-full">
                        <span className="whitespace-normal break-words">
                            {label}
                        </span>
                    </Badge>
                )}
            </div>
        );
    }

    const hiddenLabels = labels.slice(visibleCount);

    return (
        <div ref={rowRef} className={cn("relative flex min-w-0 flex-1 items-center gap-1.5", className)} aria-label="List rules">
            <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden">
                <div ref={measureRef} className="flex w-max items-center gap-1.5">
                    {labels.map(label =>
                        <Badge key={label} variant="secondary">
                            {label}
                        </Badge>
                    )}

                    <Button variant="outline" size="xs" tabIndex={-1}>
                        +{labels.length}
                    </Button>
                </div>
            </div>

            {labels.slice(0, visibleCount).map(label =>
                <Badge key={label} variant="secondary">
                    {label}
                </Badge>
            )}

            {hiddenLabels.length > 0 &&
                <Popover>
                    <PopoverTrigger
                        render={<Button variant="outline" size="xs"/>}
                        aria-label={`Show ${hiddenLabels.length} more list ${hiddenLabels.length === 1 ? "rule" : "rules"}`}
                    >
                        +{hiddenLabels.length}
                    </PopoverTrigger>
                    <PopoverContent align="start" className="max-w-[calc(100vw-2rem)]">
                        <PopoverHeader>
                            <PopoverTitle>More list rules</PopoverTitle>
                        </PopoverHeader>
                        <div className="flex flex-wrap gap-1.5">
                            {hiddenLabels.map(label =>
                                <Badge key={label} variant="secondary" className="h-auto max-w-full">
                                    <span className="whitespace-normal break-words">
                                        {label}
                                    </span>
                                </Badge>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            }
        </div>
    );
};
