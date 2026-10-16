import type {ReactNode} from "react";
import {useLayoutEffect, useRef, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger} from "@/lib/client/components/ui/popover";


interface OverflowBadgesProps {
    badges: readonly { key: string; content: ReactNode }[];
    label: string;
    itemLabel: string;
    overflowTitle: string;
    className?: string;
}


export const OverflowBadges = ({ badges, label, itemLabel, overflowTitle, className }: OverflowBadgesProps) => {
    const rowRef = useRef<HTMLDivElement>(null);

    const measureRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(0);

    useLayoutEffect(() => {
        const row = rowRef.current!;
        const measure = measureRef.current!;

        const updateVisibleCount = () => {
            const children = [...measure.children] as HTMLElement[];
            const widths = children.slice(0, -1).map(child => child.getBoundingClientRect().width);

            const available = row.getBoundingClientRect().width;
            const gap = parseFloat(getComputedStyle(measure).columnGap);

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
    }, [badges]);

    const hiddenBadges = badges.slice(visibleCount);
    const renderBadge = (badge: typeof badges[number], wrap = false) => (
        <Badge key={badge.key} variant="outline" className={wrap ? "h-auto max-w-full [&>span]:whitespace-normal [&>span]:break-words" : undefined}>
            {badge.content}
        </Badge>
    );

    return (
        <div ref={rowRef} className={cn("relative flex min-w-0 flex-1 items-center gap-1.5", className)} aria-label={label}>
            <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden">
                <div ref={measureRef} className="flex w-max items-center gap-1.5">
                    {badges.map(badge => renderBadge(badge))}

                    <Button variant="outline" size="xs" tabIndex={-1}>
                        +{badges.length}
                    </Button>
                </div>
            </div>

            {badges.slice(0, visibleCount).map(badge => renderBadge(badge))}

            {hiddenBadges.length > 0 &&
                <Popover>
                    <PopoverTrigger
                        aria-label={`Show ${hiddenBadges.length} more ${itemLabel}${hiddenBadges.length === 1 ? "" : "s"}`}
                        render={<Button variant="outline" size="xs" className="pointer-events-auto"/>}
                    >
                        +{hiddenBadges.length}
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-[calc(100vw-2rem)]">
                        <PopoverHeader>
                            <PopoverTitle>
                                {overflowTitle}
                            </PopoverTitle>
                        </PopoverHeader>
                        <div className="flex flex-wrap gap-1.5">
                            {hiddenBadges.map(badge => renderBadge(badge, true))}
                        </div>
                    </PopoverContent>
                </Popover>
            }
        </div>
    );
};
