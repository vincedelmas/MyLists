import React, {useState} from "react";
import {Link2, UploadCloud} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {useAppForm} from "@/lib/client/components/forms/form";
import {handleFormSubmit} from "@/lib/utils/form-error-handler";
import {CoverImageFormInput, requiredCoverImageSchema} from "@/lib/schemas";
import {Field, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


interface CoverImageFormProps {
    className?: string;
    onSuccess?: () => void;
    onSubmit: (value: CoverImageFormInput) => Promise<unknown>;
    children?: (actions: { useImageUrl: (imageUrl: string) => void }) => React.ReactNode;
}


export const CoverImageForm = ({ children, className, onSubmit, onSuccess }: CoverImageFormProps) => {
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const defaultValues: CoverImageFormInput = {
        imageUrl: undefined,
        imageFile: undefined,
    };
    const form = useAppForm({
        defaultValues,
        validators: {
            onSubmit: requiredCoverImageSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const success = await handleFormSubmit(formApi, () => onSubmit(value));

            if (success) {
                setMode("link");
                setFileInputKey((prev) => prev + 1);
                formApi.reset();
                onSuccess?.();
            }
        },
    });

    const clearCoverErrors = () => {
        (["imageUrl", "imageFile"] as const).forEach((fieldName) => {
            if (!form.getFieldMeta(fieldName)) return;

            form.setFieldMeta(fieldName, (meta) => ({
                ...meta,
                errorMap: { ...meta.errorMap, onSubmit: undefined },
            }));
        });
    };

    const setImageLinkMode = () => {
        setMode("link");
        clearCoverErrors();
        setFileInputKey((prev) => prev + 1);
        form.setFieldValue("imageFile", undefined);
    };

    const setImageUploadMode = () => {
        setMode("upload");
        clearCoverErrors();
        form.setFieldValue("imageUrl", undefined);
    };

    const useImageUrl = (imageUrl: string) => {
        setMode("link");
        clearCoverErrors();
        setFileInputKey((prev) => prev + 1);
        form.setFieldValue("imageFile", undefined);
        form.setFieldValue("imageUrl", imageUrl);
    };

    return (
        <form.AppForm>
            <form.FormRoot className={className}>
                <form.FormFieldset className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <Button type="button" onClick={setImageLinkMode} variant={mode === "link" ? "emeraldy" : "outline"}>
                            <Link2 className="size-4"/>{" "}
                            Cover Link
                        </Button>
                        <Button type="button" onClick={setImageUploadMode} variant={mode === "upload" ? "emeraldy" : "outline"}>
                            <UploadCloud className="size-4"/>{" "}
                            Upload Cover
                        </Button>
                    </div>

                    {mode === "link" ?
                        <form.AppField name="imageUrl">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Cover URL</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            aria-invalid={isInvalid}
                                            onBlur={field.handleBlur}
                                            value={field.state.value ?? ""}
                                            placeholder="https://example.com/cover.jpg"
                                            onChange={(ev) => field.handleChange(ev.target.value.trim() ? ev.target.value : undefined)}
                                        />
                                        {isInvalid &&
                                            <FieldError
                                                errors={field.state.meta.errors}
                                            />
                                        }
                                    </Field>
                                );
                            }}
                        </form.AppField>
                        :
                        <form.AppField name="imageFile">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Upload Cover</FieldLabel>
                                        <Input
                                            type="file"
                                            id={field.name}
                                            name={field.name}
                                            accept="image/*"
                                            key={fileInputKey}
                                            aria-invalid={isInvalid}
                                            onBlur={field.handleBlur}
                                            onChange={(ev) => field.handleChange(ev.target.files?.[0])}
                                        />
                                        {isInvalid &&
                                            <FieldError
                                                errors={field.state.meta.errors}
                                            />
                                        }
                                    </Field>
                                );
                            }}
                        </form.AppField>
                    }
                    {children?.({ useImageUrl })}
                    <form.SubmitButton
                        label="Save Custom Cover"
                    />
                </form.FormFieldset>
            </form.FormRoot>
        </form.AppForm>
    );
};
