import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Grid2X2XIcon, Loader2} from "lucide-react";
import {formatDate} from "@/lib/utils/date-formatting";
import {useNavigate, useSearch} from "@tanstack/react-router";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {allUserJobsOptions} from "@/lib/client/react-query/query-options";
import {SelectedImportJob} from "@/lib/client/components/user-settings/SelectedImportJob";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface ImportJobListItem {
    id: number;
    source: string;
    status: string;
    updatedAt: string;
    failedCount: number;
    skippedCount: number;
    finishedAt: string | null;
}


const formatImportLabel = (job: ImportJobListItem) => {
    const issueCount = job.failedCount + job.skippedCount;
    const issueLabel = issueCount > 0 ? ` · ${issueCount} issue${issueCount > 1 ? "s" : ""}` : "";

    return `#${job.id} · ${job.source} · ${job.status.replaceAll("_", " ")} · ${formatDate(job.finishedAt ?? job.updatedAt)}${issueLabel}`;
};


export function ExistingImportsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate({ from: "/settings/imports" });
    const search = useSearch({ from: "/_main/_private/settings/_layout/imports" });
    const { data: importJobs = [], isLoading, isError } = useQuery(allUserJobsOptions(isOpen));

    const selectedJob = importJobs.find(job => job.id === search.jobId);
    const selectedValue = search.jobId ? String(search.jobId) : undefined;
    const selectPlaceholder = importJobs.length === 0 ? "No imports yet" : "Select import job";
    const selectedJobLabel = selectedJob ? formatImportLabel(selectedJob) : search.jobId ? `Job #${search.jobId}` : undefined;

    const handleSelectOpenChange = (isOpen: boolean) => {
        if (isOpen) setIsOpen(true);
    };

    const handleJobDelete = () => {
        void navigate({ search: prev => ({ ...prev, page: 1, jobId: undefined }), resetScroll: false });
    };

    const handleJobChange = (jobId: string) => {
        void navigate({ search: prev => ({ ...prev, page: 1, jobId: Number(jobId) }), resetScroll: false });
    };

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">
                    Imports
                </h2>
                <p className="text-sm text-muted-foreground">
                    Check queued, running, and completed imports.
                </p>
            </div>

            <Card>
                <CardHeader className="gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(240px,360px)] sm:items-end">
                    <div>
                        <CardTitle>Import review</CardTitle>
                        <CardDescription>
                            Select a job to display its summary and unresolved rows.
                        </CardDescription>
                    </div>

                    <Select value={selectedValue} onValueChange={handleJobChange} onOpenChange={handleSelectOpenChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={selectPlaceholder}>
                                {selectedJobLabel}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {isLoading ?
                                <Loader2 className="size-5 animate-spin mx-auto"/>
                                : isError ?
                                    <div className="px-2 py-1.5 text-sm text-destructive">
                                        Imports could not be loaded.
                                    </div>
                                    : importJobs.length === 0 ?
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No imports yet.
                                        </div>
                                        :
                                        importJobs.map((job) =>
                                            <SelectItem key={job.id} value={String(job.id)}>
                                                {formatImportLabel(job)}
                                            </SelectItem>
                                        )
                            }
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {!search.jobId ?
                        <EmptyState
                            iconSize={40}
                            className="py-10"
                            icon={Grid2X2XIcon}
                            message={"No imports selected"}
                        />
                        :
                        <SelectedImportJob
                            jobId={search.jobId}
                            page={search.page ?? 1}
                            onDeleted={handleJobDelete}
                        />
                    }
                </CardContent>
            </Card>
        </section>
    );
}
