import {useState} from "react";
import {RefreshCw, Upload} from "lucide-react";
import {createFileRoute, Link} from "@tanstack/react-router";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {adminImportsSchema, type AdminImportsSearch} from "@/lib/schemas/admin.schema";
import {ImportJobStatus} from "@/lib/utils/enums";
import {formatMs} from "@/lib/utils/formatting/number";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {Button} from "@/lib/client/components/ui/button";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {ImportStatusBadge} from "@/lib/client/components/imports/ImportStatusBadge";
import {ImportJobIssuesTable} from "@/lib/client/components/imports/ImportJobIssuesTable";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {adminImportIssuesOptions, adminImportsOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/imports")({
    validateSearch: adminImportsSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context, deps: { search } }) => context.queryClient.ensureQueryData(adminImportsOptions(search)),
    component: AdminImportsPage,
});


const statusOptions = [
    { value: "all", label: "All statuses" },
    ...Object.values(ImportJobStatus).map(value => ({ value, label: value.replaceAll("_", " ") })),
];


function AdminImportsPage() {
    const filters = Route.useSearch();
    const history = useSuspenseQuery(adminImportsOptions(filters));
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [issuePage, setIssuePage] = useState(1);
    const selectedJob = history.data.items.find(job => job.id === selectedJobId);
    const issues = useQuery(adminImportIssuesOptions(selectedJobId ?? 0, issuePage,
        !!selectedJob && selectedJob.failedCount + selectedJob.skippedCount > 0));
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<AdminImportsSearch>({ search: filters.search ?? "" });

    const refresh = () => {
        void history.refetch();
        if (selectedJob && selectedJob.failedCount + selectedJob.skippedCount > 0) void issues.refetch();
    };

    return (
        <DashboardShell>
            <DashboardHeader heading="Imports" description="Track imports, processing times, and rows needing attention."/>
            <div className="flex flex-col gap-6 min-w-0">
                <div className="flex flex-wrap items-end gap-4">
                    <FieldGroup className="flex-1 sm:flex-row">
                        <Field>
                            <FieldLabel htmlFor="import-search">User or job ID</FieldLabel>
                            <SearchInput id="import-search" placeholder="Search imports…" value={localSearch} onChange={handleInputChange}/>
                        </Field>
                        <Field className="sm:max-w-60">
                            <FieldLabel htmlFor="import-status">Status</FieldLabel>
                            <Select items={statusOptions} value={filters.status ?? "all"}
                                    onValueChange={value => updateFilters({ status: value === "all" ? undefined : value as ImportJobStatus, page: 1 })}>
                                <SelectTrigger id="import-status" className="w-full capitalize"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {statusOptions.map(option => <SelectItem key={option.value} value={option.value} className="capitalize">{option.label}</SelectItem>)}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                    <Button variant="outline" disabled={history.isFetching || issues.isFetching} onClick={refresh}>
                        <RefreshCw data-icon="inline-start"/> Refresh
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Import history · {history.data.total}</CardTitle>
                        <CardDescription>Newest first. Refreshes every 10 seconds. Completed rows include entries already on the user's list.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history.isError && <Alert variant="destructive"><AlertDescription>Import history could not be refreshed. Showing the last loaded results.</AlertDescription></Alert>}
                        {history.data.items.length === 0 ? <EmptyState icon={Upload} message="No imports found."/> :
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Import</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Rows</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Processing time</TableHead>
                                        <TableHead><span className="sr-only">Details</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.data.items.map(job => (
                                        <TableRow key={job.id} data-state={selectedJobId === job.id ? "selected" : undefined}>
                                            <TableCell><div className="font-medium">#{job.id}</div><div className="text-muted-foreground capitalize">{job.source}</div></TableCell>
                                            <TableCell><Link to="/profile/$username" params={{ username: job.username }} className="hover:underline">{job.username}</Link></TableCell>
                                            <TableCell><ImportStatusBadge status={job.status}/></TableCell>
                                            <TableCell>
                                                <div>{job.processedCount}/{job.totalCount} processed</div>
                                                <div className="text-xs text-muted-foreground">{job.completedCount} completed · {job.failedCount} failed · {job.skippedCount} skipped</div>
                                            </TableCell>
                                            <TableCell>{formatDateTime(job.createdAt, { seconds: true })}</TableCell>
                                            <TableCell className="tabular-nums">
                                                {job.processingDurationMs === null ? "Not started" : job.processingDurationMs === 0 ? "<1s" : formatMs(job.processingDurationMs)}
                                                {job.status === ImportJobStatus.PROCESSING && <div className="text-xs text-muted-foreground">Still running</div>}
                                            </TableCell>
                                            <TableCell><Button size="sm" variant="outline" aria-label={`View import ${job.id}`} onClick={() => {
                                                setSelectedJobId(job.id);
                                                setIssuePage(1);
                                            }}>Details</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        }
                        <Pagination currentPage={history.data.page} totalPages={history.data.pages} onChangePage={page => updateFilters({ page })}/>
                    </CardContent>
                </Card>

                <Sheet open={!!selectedJob} onOpenChange={open => { if (!open) setSelectedJobId(null); }}>
                    <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl overflow-y-auto">
                        <SheetHeader className="pr-12">
                            <SheetTitle>{selectedJob ? `Import #${selectedJob.id} · ${selectedJob.username}` : "Import details"}</SheetTitle>
                            <SheetDescription>Processing time excludes time spent waiting in the queue and validating the upload.</SheetDescription>
                        </SheetHeader>
                        {selectedJob && <div className="flex flex-col gap-5 px-4 pb-6 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <ImportStatusBadge status={selectedJob.status}/>
                                <Button size="sm" variant="outline" disabled={history.isFetching || issues.isFetching} onClick={refresh}>
                                    <RefreshCw data-icon="inline-start"/> Refresh
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {selectedJob.processedCount}/{selectedJob.totalCount} rows processed · {selectedJob.completedCount} completed · {selectedJob.failedCount} failed · {selectedJob.skippedCount} skipped
                            </p>
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm text-muted-foreground">Processing time</dt>
                                    <dd>{selectedJob.processingDurationMs === null ? "Not started" : selectedJob.processingDurationMs === 0 ? "<1s" : formatMs(selectedJob.processingDurationMs)}</dd>
                                </div>
                                {[
                                    ["Started", selectedJob.startedAt],
                                    ["Last progress", selectedJob.updatedAt],
                                    ["Finished", selectedJob.finishedAt],
                                ].map(([label, value]) => <div key={label}>
                                    <dt className="text-sm text-muted-foreground">{label}</dt>
                                    <dd>{formatDateTime(value, { seconds: true })}</dd>
                                </div>)}
                            </dl>
                            {selectedJob.error && <Alert variant="destructive"><AlertDescription>{selectedJob.error}</AlertDescription></Alert>}
                            {selectedJob.failedCount + selectedJob.skippedCount > 0 ?
                                <ImportJobIssuesTable issueQuery={issues} onPageChange={setIssuePage}/>
                                : <p className="text-sm text-muted-foreground">{selectedJob.error ? "The file was rejected before rows could be imported." : "No row issues reported."}</p>
                            }
                        </div>}
                    </SheetContent>
                </Sheet>
            </div>
        </DashboardShell>
    );
}
