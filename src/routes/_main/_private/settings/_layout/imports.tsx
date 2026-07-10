import {useState} from "react";
import {useForm} from "react-hook-form";
import {ImportSource} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {FileSpreadsheet, Info, TriangleAlert, UploadCloud} from "lucide-react";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {importSearchSchema, ImportUploadFormValues, importUploadSchema} from "@/lib/schemas";
import {ExistingImportsPanel} from "@/lib/client/components/user-settings/ExistingImportsPanel";
import {Form, FormControl, FormField, FormItem, FormMessage} from "@/lib/client/components/ui/form";
import {useCreateImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports")({
    validateSearch: importSearchSchema,
    component: SettingsImportsPage,
});


function SettingsImportsPage() {
    const navigate = Route.useNavigate();
    const createMutation = useCreateImportJobMutation();
    const [fileInputResetKey, setFileInputResetKey] = useState(0);
    const form = useForm<ImportUploadFormValues>({
        resolver: zodResolver(importUploadSchema),
        defaultValues: {
            source: ImportSource.MYLISTS,
        },
    });

    const selectedFile = form.watch("file");
    const activeSource = form.watch("source");

    const handleSubmit = (submittedData: ImportUploadFormValues) => {
        const formData = new FormData();

        formData.set("file", submittedData.file);
        formData.set("source", submittedData.source);

        createMutation.mutate({ data: formData }, {
            onSuccess: (result) => {
                form.reset({ source: ImportSource.MYLISTS });
                setFileInputResetKey((key) => key + 1);
                void navigate({ search: prev => ({ ...prev, page: 1, jobId: result.jobId }), resetScroll: false });
            },
        });
    };

    const sourceTabs: TabItem<ImportUploadFormValues["source"]>[] = [
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
                    setActiveTab={(source) => form.setValue("source", source, { shouldValidate: true })}
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

                        <div className="rounded-xl border border-app-accent/80 p-4">
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
                                        Rows that cannot be matched automatically would need to be added by hand.
                                    </li>
                                    <li>
                                        Entries already in your list are ignored and counted as completed.
                                    </li>
                                    <li>
                                        The import is parsed immediately, then processed automatically.
                                        Refresh the selected job to check progress.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-xl border border-app-rating/80 p-4">
                            <div className="space-y-2 text-sm leading-relaxed">
                                <div className="flex gap-2 items-center font-semibold text-primary">
                                    <TriangleAlert className="size-4 text-app-rating"/>
                                    Caveat
                                </div>
                                <div className="text-muted-foreground">
                                    When adding a media by hand it will automatically create an Activity and a Media Feed.
                                    You can remove both: the Media Feed Info using the trash icon on you profile, and the Activity in
                                    the "MyActivity" page or using the "Activity Cleanup" settings page.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">
                                Instructions
                            </h3>
                            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                                <li>Export your list from the Content & Lists settings page.</li>
                                <li>Upload the generated MyLists CSV here.</li>
                                <li>Refresh the job status when needed (updated per batch so can be a minute :)).</li>
                                <li>Review skipped or failed rows and add them manually if needed.</li>
                            </ol>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold">
                                        Upload CSV File
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Only CSV are allowed, 5MB max and 3000 rows max per file.
                                    </p>
                                </div>

                                <FormField
                                    name="file"
                                    control={form.control}
                                    render={({ field: { onChange, value: _value, ...field } }) => (
                                        <FormItem>
                                            <label className="group flex min-h-44 flex-col items-center justify-center rounded-xl border
                                            border-dashed border-muted-foreground/60 bg-background/40 p-6 text-center transition
                                            cursor-pointer hover:border-app-accent hover:bg-app-accent/5">
                                                <UploadCloud className="mb-2 size-8 text-muted-foreground transition group-hover:text-app-accent"/>
                                                <span className="text-sm font-medium">
                                                    {selectedFile ? selectedFile.name : "Drop file here or click to upload"}
                                                </span>
                                                {selectedFile &&
                                                    <span className="mt-1 text-xs text-muted-foreground">
                                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                                    </span>
                                                }
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="file"
                                                        className="sr-only"
                                                        key={fileInputResetKey}
                                                        accept=".csv,text/csv,text/plain"
                                                        disabled={createMutation.isPending}
                                                        onChange={(ev) => onChange(ev.target.files?.[0])}
                                                    />
                                                </FormControl>
                                            </label>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormSubmitButton disabled={!selectedFile} isLoading={createMutation.isPending}>
                                    <UploadCloud className="size-4"/>
                                    Import File
                                </FormSubmitButton>
                            </form>
                        </Form>
                    </div>
                </div>
            </section>

            <ExistingImportsPanel/>
        </div>
    );
}
