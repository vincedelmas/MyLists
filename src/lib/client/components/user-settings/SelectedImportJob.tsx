import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ImportJobStatus} from "@/lib/utils/enums";
import {useNavigate} from "@tanstack/react-router";
import {ImportStatusBadge} from "@/lib/client/components/imports/ImportStatusBadge";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Progress} from "@/lib/client/components/ui/progress";
import {importJobIssuesOptions, importJobOptions} from "@/lib/client/react-query/query-options";
import {importJobIssuesQueryKey, importJobsQueryKey} from "@/lib/client/react-query/query-options/imports.options";
import {ImportJobIssuesTable} from "@/lib/client/components/imports/ImportJobIssuesTable";
import {useDeleteImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";
import {RefreshCw, Trash2} from "lucide-react";


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
    const navigate = useNavigate({ from: "/settings/imports" });
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const deleteMutation = useDeleteImportJobMutation(jobId);
    const { data: job, refetch, isFetching, isLoading, isError } = useQuery(importJobOptions(jobId));

    const issueQuery = useQuery(importJobIssuesOptions(jobId, { page, perPage: 25 }, !!job && job.failedCount + job.skippedCount > 0));

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                <Spinner/>
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

    const handleDelete = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Delete Job",
            title: "Delete this import job?",
            description: "This will remove the job and every row attached to it.",
        })) return;

        deleteMutation.mutate({ data: { jobId } }, {
            onSuccess: () => {
                onDeleted();
            },
        });
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
                        {job.status === ImportJobStatus.PROCESSING ? "Currently processing."
                            : job.status === ImportJobStatus.QUEUED ? job.jobsAhead
                                ? `${job.jobsAhead} job${job.jobsAhead > 1 ? "s" : ""} ahead.`
                                : "Next in queue. Waiting for processing to start."
                            : isTerminal ? "Import finished." : "Validating your file."}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        void Promise.all([
                            refetch(),
                            queryClient.invalidateQueries({ queryKey: importJobIssuesQueryKey(jobId) }),
                            queryClient.invalidateQueries({ queryKey: importJobsQueryKey }),
                        ]);
                    }} disabled={isFetching}>
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
                color="var(--primary)"
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
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {job.error}
                </div>
            }

            {issueCount > 0 ?
                <ImportJobIssuesTable
                    issueQuery={issueQuery}
                    onPageChange={nextPage => {
                        void navigate({ search: prev => ({ ...prev, page: nextPage, jobId }), resetScroll: false });
                    }}
                />
                : !job.error &&
                <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                    {isTerminal ? "No skipped or failed rows for this import." : "No row issues reported so far."}
                </div>
            }
        </div>
    );
}


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
