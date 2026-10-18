import {formatNumber} from "@/lib/utils/formatting/number";
import type {ImportJobCounterDelta} from "@/lib/types/imports.types";
import {Progress, ProgressLabel} from "@/lib/client/components/ui/progress";
import {AlertTriangle, CheckCircle2, ClipboardList, SkipForward} from "lucide-react";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";


interface ImportJobProgressProps {
    jobId: number;
    job: ImportJobCounterDelta & { totalCount: number };
}


export function ImportJobProgress({ jobId, job }: ImportJobProgressProps) {
    const progress = job.totalCount ? Math.round(job.processedCount / job.totalCount * 100) : 0;

    return (
        <div role="group" className="flex flex-col gap-5" aria-label={`Import ${jobId} progress summary`}>
            <Progress value={progress}>
                <ProgressLabel>
                    Rows processed
                </ProgressLabel>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                    {formatNumber(job.processedCount)} / {formatNumber(job.totalCount)}
                </span>
            </Progress>
            <CompactStatsGrid
                columns={4}
                items={[
                    {
                        label: "Completed",
                        value: formatNumber(job.completedCount),
                        icon: <CheckCircle2 className="size-4"/>,
                    },
                    {
                        label: "Skipped",
                        value: formatNumber(job.skippedCount),
                        icon: <SkipForward className="size-4"/>,
                    },
                    {
                        label: "Failed",
                        value: formatNumber(job.failedCount),
                        icon: <AlertTriangle className="size-4"/>,
                    },
                    {
                        label: "Need a review",
                        icon: <ClipboardList className="size-4"/>,
                        value: formatNumber(job.failedCount + job.skippedCount),
                    },
                ]}
            />
        </div>
    );
}
