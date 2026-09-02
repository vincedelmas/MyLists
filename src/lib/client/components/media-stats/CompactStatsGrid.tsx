import {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";


type CompactStatItem = {
    label: string;
    icon: ReactNode;
    note?: ReactNode;
    value: ReactNode;
};


interface CompactStatsGridProps {
    color?: string;
    columns?: 3 | 4 | 6;
    items: CompactStatItem[];
}


export const CompactStatsGrid = ({ items, color = "var(--brand)", columns = 4 }: CompactStatsGridProps) => (
    <div className={cn(
        "grid grid-cols-2 gap-y-7",
        columns === 3
            ? "sm:grid-cols-3"
            : columns === 6
                ? "sm:grid-cols-3 lg:grid-cols-6"
                : "sm:grid-cols-4",
    )}>
        {items.map((item, idx) => {
            const startsSmallRow = idx % (columns === 6 ? 3 : columns) === 0;
            const startsLargeRow = idx % columns === 0;

            return (
                <div
                    key={item.label}
                    className={cn(
                        "flex min-w-0 items-start gap-3",
                        idx % 2 === 1 && "border-l pl-4",
                        startsSmallRow ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:pl-5",
                        columns === 6 && (startsLargeRow ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-5"),
                    )}
                >
                    <span className="mt-1 shrink-0" style={{ color }}>
                        {item.icon}
                    </span>
                    <div className="min-w-0">
                        <div className="wrap-break-word text-xl font-black tabular-nums">
                            {item.value}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {item.label}
                        </div>
                        {item.note &&
                            <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground/80">
                                {item.note}
                            </div>
                        }
                    </div>
                </div>
            );
        })}
    </div>
);
