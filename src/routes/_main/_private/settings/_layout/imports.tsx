import React, {useMemo, useState} from "react";
import {importSearchSchema} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {formatDate} from "@/lib/utils/date-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {ImportItemStatus, ImportJobStatus, ImportSource} from "@/lib/utils/enums";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {useCreateImportJobMutation, useDeleteImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, Info, ListRestart, RefreshCw, Trash2, UploadCloud} from "lucide-react";
import {finishedImportJobsOptions, importJobIssuesOptions, importJobOptions} from "@/lib/client/react-query/query-options/imports.options";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports")({
    validateSearch: importSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        const finishedJobs = await queryClient.ensureQueryData(finishedImportJobsOptions);
        const selectedJobId = search.jobId ?? getDefaultSelectedJobId(finishedJobs);
        if (!selectedJobId) return;

        const job = await queryClient.ensureQueryData(importJobOptions(selectedJobId));
        const issueCount = job.failedCount + job.skippedCount;

        if (issueCount > 0) {
            await queryClient.ensureQueryData(importJobIssuesOptions(selectedJobId, { page: search.page, perPage: 25 }));
        }
    },
    component: SettingsImportsPage,
});


const terminalStatuses = new Set<string>([
    ImportJobStatus.FAILED,
    ImportJobStatus.CANCELLED,
    ImportJobStatus.COMPLETED,
    ImportJobStatus.COMPLETED_WITH_ERRORS,
]);


function SettingsImportsPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const createMutation = useCreateImportJobMutation();
    const finishedJobs = useSuspenseQuery(finishedImportJobsOptions).data;
    const selectedJobId = search.jobId ?? getDefaultSelectedJobId(finishedJobs);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [activeSource, setActiveSource] = useState<ImportSource>(ImportSource.MYLISTS);

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        if (!selectedFile || createMutation.isPending) return;

        const formData = new FormData();
        formData.set("file", selectedFile);
        formData.set("source", activeSource);

        createMutation.mutate({ data: formData }, {
            onSuccess: (result) => {
                void navigate({ search: prev => ({ ...prev, page: 1, jobId: result.jobId }), resetScroll: false });
            },
        });
    };

    const sourceTabs: TabItem<ImportSource>[] = [
        {
            isAccent: true,
            label: "MyLists",
            id: ImportSource.MYLISTS,
            icon: <FileSpreadsheet className="size-4"/>,
        },
    ];

    return (
        <div className="space-y-8">
            <section>
                <TabHeader
                    tabs={sourceTabs}
                    activeTab={activeSource}
                    setActiveTab={setActiveSource}
                />

                <div className="mt-4 px-2">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold">
                                MyLists import
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Upload a MyLists CSV export file to add import media to your lists.
                            </p>
                        </div>

                        <div className="rounded-xl border border-app-accent/50 p-4">
                            <div className="space-y-2 text-sm leading-relaxed">
                                <div className="flex gap-2 items-center font-semibold text-primary">
                                    <Info className="size-4 text-app-accent"/>
                                    Info
                                </div>
                                <ul className="list-disc pl-8 space-y-1 text-muted-foreground">
                                    <li>
                                        You can leave this page while the import runs.
                                    </li>
                                    <li>
                                        Rows that cannot be matched automatically need to be added by hand.
                                    </li>
                                    <li>
                                        The import is parsed immediately, then processed automatically.
                                        Refresh the selected job to check progress.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">
                                Instructions
                            </h3>
                            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                                <li>Export your list from the Content & Lists settings page.</li>
                                <li>Upload the generated MyLists CSV here.</li>
                                <li>Run the import drain worker, then refresh the job status when needed.</li>
                                <li>Review skipped or failed rows and add them manually if needed.</li>
                            </ol>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <h3 className="text-lg font-bold">
                                    Upload CSV File
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Only CSV are allowed, 5MB max and 3000 rows max per file.
                                </p>
                            </div>

                            <label htmlFor="mylists-import-file" className="group flex min-h-44 cursor-pointer flex-col items-center
                            justify-center rounded-xl border border-dashed border-muted-foreground/60 bg-background/40 p-6 text-center
                            transition hover:border-app-accent hover:bg-app-accent/5">
                                <UploadCloud className="mb-2 size-8 text-muted-foreground transition group-hover:text-app-accent"/>
                                <span className="text-sm font-medium">
                                    {selectedFile ? selectedFile.name : "Drop file here or click to upload"}
                                </span>
                                {selectedFile &&
                                    <span className="mt-1 text-xs text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </span>
                                }
                                <Input
                                    type="file"
                                    className="sr-only"
                                    id="mylists-import-file"
                                    accept=".csv,text/csv,text/plain"
                                    onChange={(ev) => setSelectedFile(ev.target.files?.[0] ?? null)}
                                />
                            </label>

                            <Button type="submit" disabled={!selectedFile || createMutation.isPending}>
                                <UploadCloud className="size-4"/>
                                {createMutation.isPending ? "Parsing..." : "Import File"}
                            </Button>
                        </form>
                    </div>
                </div>
            </section>

            <ExistingImportsPanel
                page={search.page ?? 1}
                finishedJobs={finishedJobs}
                selectedJobId={selectedJobId}
            />
        </div>
    );
}


interface ExistingImportsPanelProps {
    page: number;
    selectedJobId?: number;
    finishedJobs: FinishedImportJob[];
}


function ExistingImportsPanel({ page, selectedJobId, finishedJobs }: ExistingImportsPanelProps) {
    const navigate = Route.useNavigate();
    const selectedFinishedJob = finishedJobs.find(job => job.id === selectedJobId);
    const selectedValue = selectedFinishedJob ? String(selectedFinishedJob.id) : undefined;

    const handleJobChange = (value: string) => {
        void navigate({ search: (current) => ({ ...current, page: 1, jobId: Number(value) }), resetScroll: false });
    };

    const handleDeleted = (deletedJobId: number) => {
        const nextJob = finishedJobs.find((job) => job.id !== deletedJobId);
        void navigate({ search: nextJob ? { page: 1, jobId: nextJob.id } : { page: 1 }, resetScroll: false });
    };

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">
                    Existing imports
                </h2>
                <p className="text-sm text-muted-foreground">
                    Check completed imports, review rows with problems, and delete finished jobs when you no longer need them.
                </p>
            </div>

            <Card>
                <CardHeader className="gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(240px,360px)] sm:items-end">
                    <div>
                        <CardTitle>Import review</CardTitle>
                        <CardDescription>
                            Select a finished job to display its summary and unresolved rows.
                        </CardDescription>
                    </div>

                    <Select value={selectedValue} onValueChange={handleJobChange} disabled={finishedJobs.length === 0}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={finishedJobs.length === 0 ? "No Finished Imports" : "Select Imported Job"}/>
                        </SelectTrigger>
                        <SelectContent>
                            {finishedJobs.map((job) => {
                                const issueCount = job.failedCount + job.skippedCount;

                                return (
                                    <SelectItem key={job.id} value={String(job.id)}>
                                        #{job.id} · {job.source} · {formatDate(job.finishedAt ?? job.updatedAt)}
                                        {issueCount > 0 ? ` · ${issueCount} issue${issueCount > 1 ? "s" : ""}` : " · no issues"}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {!selectedJobId ?
                        <EmptyJobState/>
                        :
                        <SelectedImportJob
                            page={page}
                            jobId={selectedJobId}
                            onDeleted={handleDeleted}
                        />
                    }
                </CardContent>
            </Card>
        </section>
    );
}


function SelectedImportJob({ jobId, page, onDeleted }: { jobId: number; page: number; onDeleted: (jobId: number) => void }) {
    const deleteMutation = useDeleteImportJobMutation(jobId);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { data: job, refetch, isFetching } = useSuspenseQuery(importJobOptions(jobId));

    const isTerminal = terminalStatuses.has(job.status);
    const issueCount = job.failedCount + job.skippedCount;

    const progress = useMemo(() => {
        if (!job.totalCount) return 0;
        return Math.round((job.processedCount / job.totalCount) * 100);
    }, [job.processedCount, job.totalCount]);

    const handleDelete = () => {
        if (deleteMutation.isPending) return;

        deleteMutation.mutate({ data: { jobId } }, {
            onSuccess: () => {
                onDeleted(jobId);
                setConfirmDeleteOpen(false);
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
                        {getQueueLabel(job.jobsAhead)}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className="size-4"/>
                        Refresh
                    </Button>
                    {isTerminal &&
                        <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)} disabled={deleteMutation.isPending}>
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

            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete import job #{jobId}?</DialogTitle>
                        <DialogDescription>
                            This removes the finished job and every row attached to it. If there are skipped or failed rows,
                            they will disappear from this review screen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleteMutation.isPending}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete job"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


function ImportJobIssuesTable({ jobId, page }: { jobId: number; page: number }) {
    const navigate = Route.useNavigate();
    const issueQuery = useSuspenseQuery(importJobIssuesOptions(jobId, { page, perPage: 25 }));

    const handlePageChange = (nextPage: number) => {
        void navigate({
            search: (current) => ({
                ...current,
                page: nextPage,
                jobId,
            }),
        });
    };

    return (
        <div className="space-y-3">
            <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                    <AlertTriangle className="size-4 text-amber-500"/>
                    Media to Add by Hand
                </h3>
                <p className="text-sm text-muted-foreground">
                    These rows were not added automatically because they failed validation, were not found, or were ambiguous.
                </p>
            </div>

            <div className="overflow-hidden rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issueQuery.data.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.rowNumber}</TableCell>
                                <TableCell className="font-medium">{item.name ?? "Unknown"}</TableCell>
                                <TableCell>{item.releaseDate ?? "—"}</TableCell>
                                <TableCell className="capitalize">{item.mediaType ?? "Unknown"}</TableCell>
                                <TableCell>
                                    <Badge variant={item.status === ImportItemStatus.FAILED ? "destructive" : "secondary"}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-xl whitespace-normal text-muted-foreground">
                                    {item.statusReason}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                currentPage={issueQuery.data.page}
                totalPages={issueQuery.data.pages}
                onChangePage={handlePageChange}
            />
        </div>
    );
}


function EmptyJobState() {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <FileSpreadsheet className="mb-2 size-9 text-muted-foreground"/>
            <p className="font-medium">
                No finished imports yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Once an import finishes, it will appear in the selector above for review and deletion.
            </p>
        </div>
    );
}


function ImportMetric({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-lg font-semibold">
                {value}
            </p>
        </div>
    );
}


function ImportStatusBadge({ status }: { status: string }) {
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
}


function getQueueLabel(jobsAhead?: number | null) {
    if (jobsAhead === null || jobsAhead === undefined) return "No queue position available.";
    if (jobsAhead === 0) return "Currently processing.";
    return `${jobsAhead} job${jobsAhead > 1 ? "s" : ""} ahead.`;
}


function getDefaultSelectedJobId(jobs: FinishedImportJob[]) {
    return jobs.find((job) => job.failedCount + job.skippedCount > 0)?.id ?? jobs[0]?.id;
}


interface FinishedImportJob {
    id: number;
    createdAt: string;
    updatedAt: string;
    totalCount: number;
    failedCount: number;
    skippedCount: number;
    error: string | null;
    source: ImportSource;
    completedCount: number;
    processedCount: number;
    status: ImportJobStatus;
    startedAt: string | null;
    finishedAt: string | null;
}
