import {useState} from "react";
import {RefreshCw} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {ImportJobProgress} from "@/lib/client/components/imports/ImportJobProgress";
import {ImportStatusBadge} from "@/lib/client/components/imports/ImportStatusBadge";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {ImportJobIssuesTable} from "@/lib/client/components/imports/ImportJobIssuesTable";
import {formatImportProcessingTime} from "@/lib/client/components/imports/import-formatting";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";
import {adminImportIssuesOptions, type AdminImportJob} from "@/lib/client/react-query/query-options/admin.options";


interface ImportDetailsSheetProps {
    job: AdminImportJob;
    onClose: () => void;
    isRefreshing: boolean;
    isRefreshError: boolean;
    onRefresh: () => Promise<unknown>;
}


export function ImportDetailsSheet({ job, isRefreshing, isRefreshError, onClose, onRefresh }: ImportDetailsSheetProps) {
    const [issuePage, setIssuePage] = useState(1);
    const hasIssues = job.failedCount + job.skippedCount > 0;
    const issues = useQuery(adminImportIssuesOptions(job.id, issuePage, hasIssues));

    const refresh = () => {
        void onRefresh();
        if (hasIssues) void issues.refetch();
    };

    return (
        <Sheet
            open={true}
            onOpenChange={open => {
                if (!open) onClose();
            }}
        >
            <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
                <SheetHeader className="pr-12">
                    <SheetTitle>
                        Import #{job.id} · {job.username}
                    </SheetTitle>
                    <SheetDescription>
                        Processing time excludes time spent waiting in the queue and validating the upload.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-w-0 flex-col gap-6 px-4 pb-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ImportStatusBadge
                            status={job.status}
                            nextAttemptAt={job.nextAttemptAt}
                        />
                        <LoadingButton
                            size="sm"
                            variant="outline"
                            onClick={refresh}
                            isLoading={isRefreshing || issues.isFetching}
                            icon={<RefreshCw data-icon="inline-start"/>}
                        >
                            Refresh
                        </LoadingButton>
                    </div>
                    {isRefreshError &&
                        <InlineErrorContainer>
                            Import details could not be refreshed. Showing the last loaded results.
                        </InlineErrorContainer>
                    }
                    <ImportJobProgress
                        job={job}
                        jobId={job.id}
                    />
                    <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Processing time
                            </dt>
                            <dd className="mt-1 text-sm font-medium tabular-nums">
                                {formatImportProcessingTime(job.processingDurationMs)}
                            </dd>
                        </div>
                        {[
                            ["Submitted", job.createdAt],
                            ["Started", job.startedAt],
                            ["Last progress", job.updatedAt],
                            ["Finished", job.finishedAt],
                            ["Automatic retry after", job.nextAttemptAt],
                        ].map(([label, value]) =>
                            <div key={label}>
                                <dt className="text-xs text-muted-foreground">
                                    {label}
                                </dt>
                                <dd className="mt-1 text-sm">
                                    {formatDateTime(value, { seconds: true })}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {job.error &&
                        <Alert variant={job.nextAttemptAt ? "default" : "destructive"}>
                            <AlertDescription className="wrap-break-word whitespace-pre-wrap">
                                {job.error}
                            </AlertDescription>
                        </Alert>
                    }

                    {hasIssues ?
                        <ImportJobIssuesTable
                            issueQuery={issues}
                            onPageChange={setIssuePage}
                        />
                        :
                        <p className="text-sm text-muted-foreground">
                            {job.nextAttemptAt
                                ? "Unfinished rows will be retried automatically."
                                : job.error && !job.startedAt
                                    ? "The file was rejected before rows could be imported."
                                    : "No row issues reported."
                            }
                        </p>
                    }
                </div>
            </SheetContent>
        </Sheet>
    );
}
