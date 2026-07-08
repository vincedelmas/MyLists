import React, {Suspense} from "react";
import {Grid2X2XIcon} from "lucide-react";
import {useNavigate} from "@tanstack/react-router";
import {formatDate} from "@/lib/utils/date-formatting";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {finishedImportJobsOptions} from "@/lib/client/react-query/query-options";
import {SelectedImportJob} from "@/lib/client/components/user-settings/SelectedImportJob";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface ExistingImportsPanelProps {
    page: number;
    selectedJobId?: number;
    finishedJobs: Awaited<ReturnType<NonNullable<typeof finishedImportJobsOptions.queryFn>>>;
}


export function ExistingImportsPanel({ page, selectedJobId, finishedJobs }: ExistingImportsPanelProps) {
    const navigate = useNavigate({ from: "/settings/imports" });
    const selectedFinishedJob = finishedJobs.find(job => job.id === selectedJobId);
    const selectedValue = selectedFinishedJob ? String(selectedFinishedJob.id) : undefined;

    const handleDeleted = () => {
        void navigate({ search: { page: 1 }, resetScroll: false });
    };

    const handleJobChange = (value: string) => {
        void navigate({ search: prev => ({ ...prev, page: 1, jobId: value }), resetScroll: false });
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
                            <SelectValue
                                placeholder={finishedJobs.length === 0 ? "No Finished Imports" : "Select Imported Job"}
                            />
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
                        <EmptyState
                            iconSize={40}
                            className="py-10"
                            icon={Grid2X2XIcon}
                            message={"No finished imports yet"}
                        />
                        :
                        <Suspense>
                            <SelectedImportJob
                                page={page}
                                jobId={selectedJobId}
                                onDeleted={handleDeleted}
                            />
                        </Suspense>
                    }
                </CardContent>
            </Card>
        </section>
    );
}
