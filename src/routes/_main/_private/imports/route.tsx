import React, {useMemo, useState} from "react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ImportItemStatus, ImportJobStatus, ImportSource} from "@/lib/utils/enums";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {importJobIssuesOptions, importJobOptions} from "@/lib/client/react-query/query-options/imports.options";
import {AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, ListRestart, RefreshCw, Trash2, UploadCloud} from "lucide-react";
import {useCreateImportJobMutation, useDeleteImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";


export const Route = createFileRoute("/_main/_private/imports")({
    validateSearch: (search): ImportsSearch => ({
        jobId: parseOptionalPositiveInt(search.jobId),
        page: parseOptionalPositiveInt(search.page) ?? 1,
    }),
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        if (!search.jobId) return;

        const job = await queryClient.ensureQueryData(importJobOptions(search.jobId));
        const issueCount = job.failedCount + job.skippedCount;

        if (issueCount > 0) {
            await queryClient.ensureQueryData(importJobIssuesOptions(search.jobId, { page: search.page, perPage: 25 }));
        }
    },
    component: ImportsPage,
});


interface ImportsSearch {
    page: number;
    jobId?: number;
}


const terminalStatuses = new Set<string>([
    ImportJobStatus.FAILED,
    ImportJobStatus.CANCELLED,
    ImportJobStatus.COMPLETED,
    ImportJobStatus.COMPLETED_WITH_ERRORS,
]);


function ImportsPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const activeJobId = search.jobId ?? null;
    const createMutation = useCreateImportJobMutation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleSubmit = (ev: React.SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        if (!selectedFile || createMutation.isPending) return;

        const formData = new FormData();
        formData.set("source", ImportSource.MYLISTS);
        formData.set("file", selectedFile);

        createMutation.mutate({ data: formData }, {
            onSuccess: (result) => {
                void navigate({
                    search: (current) => ({
                        ...current,
                        page: 1,
                        jobId: result.jobId,
                    }),
                });
            },
        });
    };

    return (
        <PageTitle title="Imports" subtitle="Bring a MyLists CSV back into your account. Processing is manual-refresh for now.">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card className="relative overflow-hidden border-app-accent/20 bg-linear-to-br from-app-accent/10 via-card to-card">
                    <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-app-accent/20 blur-3xl"/>
                    <CardHeader className="relative">
                        <div className="mb-2 flex size-11 items-center justify-center rounded-xl border border-app-accent/30
                        bg-app-accent/15 text-app-accent">
                            <UploadCloud className="size-5"/>
                        </div>
                        <CardTitle>Upload CSV</CardTitle>
                        <CardDescription>
                            First source supported here is MyLists. Other import sources can plug into the same flow later.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative">
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="rounded-xl border bg-background/55 p-4">
                                <label className="mb-2 block text-sm font-medium" htmlFor="mylists-import-file">
                                    MyLists CSV file
                                </label>
                                <Input
                                    type="file"
                                    id="mylists-import-file"
                                    accept=".csv,text/csv,text/plain"
                                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                                />
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    Maximum size is 5MB. The parser expects MyLists CSV columns and validates rows before queuing the job.
                                </p>
                            </div>

                            <Button className="w-full" type="submit" disabled={!selectedFile || createMutation.isPending}>
                                {createMutation.isPending ? "Parsing..." : "Create import job"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Current job</CardTitle>
                            <CardDescription>
                                Refresh manually to check if the drain worker picked it up or finished it.
                            </CardDescription>
                        </div>
                        {activeJobId &&
                            <ActiveImportJobStatus
                                jobId={activeJobId}
                            />
                        }
                    </CardHeader>
                    <CardContent>
                        {!activeJobId ?
                            <EmptyJobState/>
                            :
                            <ActiveImportJob
                                jobId={activeJobId}
                                onDeleted={() => {
                                    setSelectedFile(null);
                                    void navigate({ search: { page: 1 } });
                                }}
                            />
                        }
                    </CardContent>
                </Card>
            </div>

            {activeJobId &&
                <ImportJobIssues jobId={activeJobId} page={search.page}/>
            }
        </PageTitle>
    );
}


function ActiveImportJobStatus({ jobId }: { jobId: number }) {
    const job = useSuspenseQuery(importJobOptions(jobId)).data;
    return (
        <ImportStatusBadge
            status={job.status}
        />
    );
}


function ActiveImportJob({ jobId, onDeleted }: { jobId: number; onDeleted: () => void }) {
    const deleteMutation = useDeleteImportJobMutation(jobId);
    const { data: job, refetch, isFetching } = useSuspenseQuery(importJobOptions(jobId));

    const isTerminal = terminalStatuses.has(job.status);
    const progress = useMemo(() => {
        if (!job.totalCount) return 0;
        return Math.round((job.processedCount / job.totalCount) * 100);
    }, [job]);

    const handleDelete = () => {
        if (deleteMutation.isPending) return;

        deleteMutation.mutate({ data: { jobId } }, {
            onSuccess: onDeleted,
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                <div>
                    <p className="text-sm font-semibold">Job #{jobId}</p>
                    <p className="text-xs text-muted-foreground">
                        {job.jobsAhead === null || job.jobsAhead === undefined
                            ? "No queue position available."
                            : job.jobsAhead === 0
                                ? "Currently processing."
                                : `${job.jobsAhead} job${job.jobsAhead > 1 ? "s" : ""} ahead.`}
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

            <Progress value={progress} color="var(--color-app-accent)"/>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            </div>
            {job.error &&
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {job.error}
                </div>
            }
        </div>
    );
}


function ImportJobIssues({ jobId, page }: { jobId: number; page: number }) {
    const job = useSuspenseQuery(importJobOptions(jobId)).data;
    const issueCount = job.failedCount + job.skippedCount;

    if (issueCount === 0) return null;

    return (
        <ImportJobIssuesTable
            page={page}
            jobId={jobId}
        />
    );
}


function ImportJobIssuesTable({ jobId, page }: { jobId: number; page: number }) {
    const issueQuery = useSuspenseQuery(importJobIssuesOptions(jobId, { page, perPage: 25 }));

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-500"/>
                    Rows that need attention
                </CardTitle>
                <CardDescription>
                    These rows were not added automatically. Add them manually later if they matter.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
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
            </CardContent>
        </Card>
    );
}


function EmptyJobState() {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <FileSpreadsheet className="mb-3 size-10 text-muted-foreground"/>
            <p className="font-medium">No import job selected</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload a CSV to create a parsing job. The returned job will appear here.
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


const parseOptionalPositiveInt = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};
