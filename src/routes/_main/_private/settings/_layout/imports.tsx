import React, {useState} from "react";
import {ImportSource} from "@/lib/utils/enums";
import {importSearchSchema} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {FileSpreadsheet, Info, UploadCloud} from "lucide-react";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {ExistingImportsPanel} from "@/lib/client/components/user-settings/ExistingImportsPanel";
import {finishedImportJobsOptions} from "@/lib/client/react-query/query-options/imports.options";
import {useCreateImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports")({
    validateSearch: importSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(finishedImportJobsOptions);
    },
    component: SettingsImportsPage,
});


function SettingsImportsPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const createMutation = useCreateImportJobMutation();
    const finishedJobs = useSuspenseQuery(finishedImportJobsOptions).data;
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
                                Import File
                            </Button>
                        </form>
                    </div>
                </div>
            </section>

            <ExistingImportsPanel
                page={search.page ?? 1}
                finishedJobs={finishedJobs}
                selectedJobId={search.jobId}
            />
        </div>
    );
}
