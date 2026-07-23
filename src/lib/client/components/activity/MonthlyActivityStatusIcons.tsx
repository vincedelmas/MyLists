import {CheckCircle, Hourglass, RotateCw} from "lucide-react";
import type {MonthlyActivityEditor} from "@/lib/types/activity.types";


export function MonthlyActivityStatusIcons({ row }: { row: MonthlyActivityEditor }) {
    return (
        <span className="ml-auto flex items-center gap-1.5">
            {row.progressGained > 0 &&
                <Hourglass
                    size={12}
                    aria-label="Progressed"
                    className="text-neutral-300"
                />
            }
            {row.hadCompletion &&
                <CheckCircle
                    size={12}
                    aria-label="Completed"
                    className="text-neutral-300"
                />
            }
            {row.redoGained > 0 &&
                <span className="flex items-center gap-0.5" title={`${row.redoGained} re-experience${row.redoGained === 1 ? "" : "s"}`}>
                    <RotateCw size={12} className="text-neutral-300"/>
                    {row.redoGained > 1 && <span>{row.redoGained}</span>}
                </span>
            }
        </span>
    );
}
