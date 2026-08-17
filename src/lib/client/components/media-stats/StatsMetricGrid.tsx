import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";


type StatsMetric = {
    label: string;
    value: ReactNode;
    note?: ReactNode;
};


interface StatsMetricGridProps {
    items: readonly [StatsMetric, StatsMetric, StatsMetric];
}


export function StatsMetricGrid({ items }: StatsMetricGridProps) {
    return (
        <div className="grid border-y sm:grid-cols-3">
            {items.map((item, idx) =>
                <div
                    key={item.label}
                    className={cn("border-t p-5 first:border-t-0 sm:border-t-0 sm:p-7", idx < items.length - 1 && "sm:border-r")}
                >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-black tabular-nums">
                        {item.value}
                    </div>
                    {item.note !== undefined &&
                        <div className="mt-2 text-sm text-muted-foreground">
                            {item.note}
                        </div>
                    }
                </div>
            )}
        </div>
    );
}
