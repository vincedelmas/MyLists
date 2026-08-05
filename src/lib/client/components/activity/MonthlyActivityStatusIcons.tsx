import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {CheckCircle, EyeOff, Hourglass, RotateCw} from "lucide-react";


export function MonthlyActivityStatusIcons({ row }: { row: MonthlyActivityEditor }) {
    if (row.hidden) {
        return (
            <span className="flex items-center gap-1.5">
                <span title="Hidden activity" className="inline-flex">
                    <EyeOff
                        size={13}
                        aria-label="Hidden activity"
                        className="text-destructive/80"
                    />
                </span>
            </span>
        )
    }

    return (
        <span className="flex items-center gap-1.5">
            {row.progressGained > 0 &&
                <Hourglass
                    size={13}
                    aria-label="Progressed"
                    className="text-white/70"
                />
            }
            {row.hadCompletion &&
                <CheckCircle
                    size={13}
                    aria-label="Completed"
                    className="text-white/70"
                />
            }
            {row.redoGained > 0 &&
                <span className="flex items-center gap-0.5" title={`${row.redoGained} re-experience${row.redoGained === 1 ? "" : "s"}`}>
                    <RotateCw size={13} className="text-white/70"/>
                    {row.redoGained > 1 && <span>{row.redoGained}</span>}
                </span>
            }
        </span>
    );
}
