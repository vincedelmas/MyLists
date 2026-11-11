import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {CheckCircle, EyeOff, Hourglass, RotateCw} from "lucide-react";


export function MonthlyActivityStatusIcons({ row }: { row: MonthlyActivityEditor }) {
    const status = row.occurrences?.[0] ?? row;

    if (status.hidden) {
        return (
            <span title="Hidden activity" className="inline-flex">
                <EyeOff
                    size={13}
                    aria-label="Hidden activity"
                    className="text-destructive/80"
                />
            </span>
        );
    }

    if (status.redoGained > 0) {
        return (
            <span className="flex items-center gap-0.5" title={`${status.redoGained} re-experience${status.redoGained === 1 ? "" : "s"}`}>
                <RotateCw
                    size={13}
                    className="text-muted-foreground"
                    aria-label="Latest activity: Re-experienced"
                />
                {status.redoGained > 1 &&
                    <span>{status.redoGained}</span>
                }
            </span>
        );
    }

    if (status.hadCompletion) {
        return (
            <CheckCircle
                size={13}
                className="text-muted-foreground"
                aria-label="Latest activity: Completed"
            />
        );
    }

    if (status.progressGained > 0) {
        return (
            <Hourglass
                size={13}
                className="text-muted-foreground"
                aria-label="Latest activity: Progressed"
            />
        );
    }

    return null;
}
