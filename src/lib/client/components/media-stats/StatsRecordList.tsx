import {ReactNode} from "react";


type StatsRecord = {
    label: string;
    value: ReactNode;
    icon: ReactNode;
    note?: ReactNode;
};


interface StatsRecordListProps {
    records: StatsRecord[];
    color?: string;
}


export function StatsRecordList({ records, color = "var(--brand)" }: StatsRecordListProps) {
    return (
        <div className="h-fit divide-y border-y px-4">
            {records.map((record) =>
                <div key={record.label} className="flex items-center gap-3 py-4">
                    <span style={{ color }}>
                        {record.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {record.label}
                        </div>
                        <div className="mt-1 text-lg font-bold">
                            {record.value}
                        </div>
                        {record.note &&
                            <div className="text-xs text-muted-foreground">
                                {record.note}
                            </div>
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
