import {useId} from "react";
import {Link2, UploadCloud} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";
import {Controller, useFormContext} from "react-hook-form";
import type {UpdateBookCoverInput} from "@/lib/schemas/media-details.schema";
import {Field, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";


interface CoverSourceFieldsProps {
    disabled: boolean;
    mode: "link" | "upload";
    onModeChange: (mode: "link" | "upload") => void;
}


export const CoverSourceFields = ({ mode, onModeChange, disabled }: CoverSourceFieldsProps) => {
    const fieldId = useId();
    const form = useFormContext<Pick<UpdateBookCoverInput, "imageUrl" | "imageFile">>();

    return (
        <>
            <ToggleGroup
                value={[mode]}
                variant="outline"
                disabled={disabled}
                aria-label="Cover source"
                className="grid w-full grid-cols-2 gap-3"
                onValueChange={([value]) => {
                    if (!value) return;
                    form.clearErrors(["imageFile", "imageUrl"]);
                    form.setValue(value === "link" ? "imageFile" : "imageUrl", undefined);
                    onModeChange(value as CoverSourceFieldsProps["mode"]);
                }}
            >
                <ToggleGroupItem value="link">
                    <Link2 data-icon="inline-start"/>{" "}
                    Image link
                </ToggleGroupItem>
                <ToggleGroupItem value="upload">
                    <UploadCloud data-icon="inline-start"/>{" "}
                    Upload image
                </ToggleGroupItem>
            </ToggleGroup>
            {mode === "link" ?
                <Controller
                    name="imageUrl"
                    control={form.control}
                    render={({ field, fieldState }) =>
                        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
                            <FieldLabel htmlFor={`${fieldId}-image-url`}>
                                Image URL
                            </FieldLabel>
                            <Input
                                {...field}
                                value={field.value ?? ""}
                                id={`${fieldId}-image-url`}
                                aria-invalid={fieldState.invalid}
                                placeholder="https://example.com/cover.jpg"
                                aria-describedby={fieldState.invalid ? `${fieldId}-image-url-error` : undefined}
                                onChange={(ev) => field.onChange(ev.target.value.trim() ? ev.target.value : undefined)}
                            />
                            <FieldError
                                errors={[fieldState.error]}
                                id={`${fieldId}-image-url-error`}
                            />
                        </Field>
                    }
                />
                :
                <Controller
                    name="imageFile"
                    control={form.control}
                    render={({ field: { onChange, onBlur, name, ref }, fieldState }) =>
                        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
                            <FieldLabel htmlFor={`${fieldId}-image-file`}>
                                Upload image
                            </FieldLabel>
                            <Input
                                ref={ref}
                                name={name}
                                type="file"
                                key="imageFile"
                                onBlur={onBlur}
                                accept="image/*"
                                id={`${fieldId}-image-file`}
                                aria-invalid={fieldState.invalid}
                                onChange={(ev) => onChange(ev.target.files?.[0] ?? undefined)}
                                aria-describedby={fieldState.invalid ? `${fieldId}-image-file-error` : undefined}
                            />
                            <FieldError
                                errors={[fieldState.error]}
                                id={`${fieldId}-image-file-error`}
                            />
                        </Field>
                    }
                />
            }
        </>
    );
};
