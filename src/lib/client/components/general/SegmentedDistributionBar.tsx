import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {formatPercent} from "@/lib/utils/number-formatting";


type DistributionSegment = {
    color: string;
    label: string;
    percentage: number;
};


interface SegmentedDistributionBarProps {
    className?: string;
    segments: DistributionSegment[];
    renderSegment?: (segment: DistributionSegment) => ReactNode;
}


export function SegmentedDistributionBar({ segments, className, renderSegment }: SegmentedDistributionBarProps) {
    const visibleSegments = segments.filter(({ percentage }) => percentage > 0);

    return (
        <div
            role="img"
            className={cn("flex h-5 w-full gap-0.5 overflow-hidden rounded-sm bg-background", className)}
            aria-label={visibleSegments
                .map(({ label, percentage }) => `${label}: ${formatPercent(percentage)}`)
                .join(", ")}
        >
            {visibleSegments.map((segment) =>
                <div
                    key={segment.label}
                    title={`${segment.label}: ${formatPercent(segment.percentage)}`}
                    className="flex h-full min-w-px basis-0 items-center justify-center"
                    style={{ flexGrow: segment.percentage, backgroundColor: segment.color }}
                >
                    {renderSegment?.(segment)}
                </div>
            )}
        </div>
    );
}
