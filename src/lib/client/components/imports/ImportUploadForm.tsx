import {UploadCloud} from "lucide-react";
import {useNavigate} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {type ReactNode, useId, useState} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {MAX_IMPORT_FILE_SIZE, MAX_IMPORT_ROWS} from "@/lib/utils/constants";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {ImportUploadFormValues, importUploadSchema} from "@/lib/schemas/imports.schema";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {type Control, Controller, type DefaultValues, FormProvider, useForm} from "react-hook-form";
import {useCreateImportJobMutation} from "@/lib/client/react-query/query-mutations/imports.mutations";


interface ImportUploadFormProps {
    defaultValues: DefaultValues<ImportUploadFormValues>;
    children?: (props: {
        isSubmitting: boolean;
        control: Control<ImportUploadFormValues>;
    }) => ReactNode;
}


export function ImportUploadForm({ defaultValues, children }: ImportUploadFormProps) {
    const fieldId = useId();
    const navigate = useNavigate();
    const createMutation = useCreateImportJobMutation();
    const [fileInputResetKey, setFileInputResetKey] = useState(0);
    const form = useForm<ImportUploadFormValues>({ resolver: zodResolver(importUploadSchema), defaultValues });

    const { isSubmitting } = form.formState;
    const selectedFile = form.watch("file");

    const handleSubmit = async (values: ImportUploadFormValues) => {
        try {
            const formData = new FormData();
            for (const [key, value] of Object.entries(values)) {
                formData.set(key, value);
            }

            const result = await createMutation.mutateAsync({ data: formData });
            await navigate({ to: ".", search: prev => ({ ...prev, page: 1, jobId: result.jobId }), resetScroll: false });

            const { file: _file, ...options } = values;
            form.reset(options);

            setFileInputResetKey(key => key + 1);
        }
        catch {
            // Mutation errors are shown by global handler. Keep file for retry
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                <div>
                    <h3 className="text-lg font-bold">
                        Upload CSV File
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        CSV files only, up to {MAX_IMPORT_FILE_SIZE / 1048576} MB and {MAX_IMPORT_ROWS} rows per file.
                    </p>
                </div>

                <FieldGroup>
                    {children?.({ control: form.control, isSubmitting })}
                    <Controller
                        name="file"
                        control={form.control}
                        render={({ field: { onChange, value: _value, ...field }, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                <FieldLabel
                                    htmlFor={`${fieldId}-file`}
                                    className="group flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border
                                    border-dashed border-muted-foreground/60 bg-background/40 p-6 text-center transition hover:border-brand hover:bg-brand/5"
                                >
                                    <UploadCloud
                                        className="mb-2 size-8 text-muted-foreground transition group-hover:text-brand"
                                    />

                                    <span className="text-sm font-medium">
                                        {selectedFile ? selectedFile.name : "Click to choose a CSV file"}
                                    </span>

                                    {selectedFile &&
                                        <span className="mt-1 text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </span>
                                    }

                                    <Input
                                        {...field}
                                        type="file"
                                        className="sr-only"
                                        id={`${fieldId}-file`}
                                        key={fileInputResetKey}
                                        disabled={isSubmitting}
                                        accept=".csv,text/csv,text/plain"
                                        aria-invalid={fieldState.invalid}
                                        onChange={(ev) => onChange(ev.target.files?.[0])}
                                    />
                                </FieldLabel>
                                <FieldError errors={[fieldState.error]}/>
                            </Field>
                        )}
                    />
                </FieldGroup>

                <FormSubmitButton disabled={!selectedFile} isLoading={isSubmitting}>
                    <UploadCloud data-icon="inline-start"/>
                    Import File
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
}
