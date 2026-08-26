import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {CheckCircle, EyeOff, Hourglass, RotateCw} from "lucide-react";


export function MonthlyActivityStatusIcons({ row }: { row: MonthlyActivityEditor }) {
    const status = row.occurrences?.[0] ?? row;

    if (status.hidden) {
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

    if (row.occurrences) {
        if (status.hadCompletion) {
            return <CheckCircle size={13} aria-label="Latest activity: Completed" className="text-white/70"/>;
        }

        if (status.redoGained > 0) {
            return <RotateCw size={13} aria-label="Latest activity: Re-experienced" className="text-white/70"/>;
        }

        if (status.progressGained > 0) {
            return <Hourglass size={13} aria-label="Latest activity: Progressed" className="text-white/70"/>;
        }

        return null;
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
