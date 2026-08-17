import {ReactNode} from "react";


type CompactStatItem = {
    label: string;
    icon: ReactNode;
    note?: ReactNode;
    value: ReactNode;
};


interface CompactStatsGridProps {
    color?: string;
    items: CompactStatItem[];
}


export const CompactStatsGrid = ({ items, color = "var(--brand)" }: CompactStatsGridProps) => (
    <div className="grid grid-cols-2 gap-y-7 sm:grid-cols-4">
        {items.map((item, idx) =>
            <div
                key={item.label}
                className={`
                    flex min-w-0 items-start gap-3
                    ${idx % 2 === 1 ? "border-l pl-4" : ""}
                    ${idx % 4 === 0 ? "sm:border-l-0 sm:pl-0" : "sm:border-l sm:pl-5"}
                `}
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
        )}
    </div>
);
