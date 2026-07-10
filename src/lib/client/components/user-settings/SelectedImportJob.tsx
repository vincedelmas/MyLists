import {useQuery} from "@tanstack/react-query";
import {ImportJobStatus} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {importJobOptions} from "@/lib/client/react-query/query-options";
import {ImportJobIssuesTable} from "@/lib/client/components/user-settings/ImportJobIssuesTable";
import {useDeleteImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";
import {AlertTriangle, CheckCircle2, Clock3, ListRestart, Loader2, RefreshCw, Trash2} from "lucide-react";


interface SelectedImportJobProps {
    page: number;
    jobId: number;
    onDeleted: () => void;
}


const terminalStatuses = new Set<string>([
    ImportJobStatus.FAILED,
    ImportJobStatus.CANCELLED,
    ImportJobStatus.COMPLETED,
    ImportJobStatus.COMPLETED_WITH_ERRORS,
]);


export function SelectedImportJob({ jobId, page, onDeleted }: SelectedImportJobProps) {
    const deleteMutation = useDeleteImportJobMutation(jobId);
    const { data: job, refetch, isFetching, isLoading, isError } = useQuery(importJobOptions(jobId));

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin"/>
            </div>
        );
    }

    if (isError || !job) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                This import job could not be loaded.
            </div>
        );
    }

    const isTerminal = terminalStatuses.has(job.status);
    const issueCount = job.failedCount + job.skippedCount;
    const progress = job.totalCount ? Math.round((job.processedCount / job.totalCount) * 100) : 0;

    const handleDelete = () => {
        if (!window.confirm(
            "Are you sure you want to delete this import job? " +
            "This will remove the job and every row attached to it."
        )) return;

        deleteMutation.mutate({ data: { jobId } }, {
            onSuccess: () => {
                onDeleted();
            },
        });
    };

    const getQueueLabel = (jobsAhead?: number | null) => {
        if (jobsAhead === null || jobsAhead === undefined) return "No queue position available.";
        if (jobsAhead === 0) return "Currently processing.";
        return `${jobsAhead} job${jobsAhead > 1 ? "s" : ""} ahead.`;
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                            Job #{jobId}
                        </p>
                        <ImportStatusBadge
                            status={job.status}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {getQueueLabel(job.jobsAhead)}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className="size-4"/>
                        Refresh
                    </Button>
                    {isTerminal &&
                        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
                            <Trash2 className="size-4"/>
                            Delete
                        </Button>
                    }
                </div>
            </div>

            <Progress
                value={progress}
                color="var(--color-app-accent)"
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <ImportMetric
                    label="Processed"
                    value={`${job.processedCount}/${job.totalCount}`}
                />
                <ImportMetric
                    label="Completed"
                    value={job.completedCount}
                />
                <ImportMetric
                    label="Skipped"
                    value={job.skippedCount}
                />
                <ImportMetric
                    label="Failed"
                    value={job.failedCount}
                />
                <ImportMetric
                    value={issueCount}
                    label="Need a review"
                />
            </div>

            {job.error &&
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {job.error}
                </div>
            }

            {issueCount === 0 ?
                <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                    No skipped or failed rows for this import.
                </div>
                :
                <ImportJobIssuesTable
                    page={page}
                    jobId={jobId}
                />
            }
        </div>
    );
}


const ImportStatusBadge = ({ status }: { status: string }) => {
    if (status === ImportJobStatus.COMPLETED) {
        return <Badge variant="emerald"><CheckCircle2 className="size-3"/>Completed</Badge>;
    }

    if (status === ImportJobStatus.COMPLETED_WITH_ERRORS) {
        return <Badge variant="secondary"><ListRestart className="size-3"/>Completed with errors</Badge>;
    }

    if (status === ImportJobStatus.FAILED || status === ImportJobStatus.CANCELLED) {
        return <Badge variant="destructive"><AlertTriangle className="size-3"/>{status}</Badge>;
    }

    return <Badge variant="outline"><Clock3 className="size-3"/>{status}</Badge>;
};


const ImportMetric = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-xl border bg-background/60 p-3">
        <p className="text-xs text-muted-foreground">
            {label}
        </p>
        <p className="mt-1 text-lg font-semibold">
            {value}
        </p>
    </div>
);
