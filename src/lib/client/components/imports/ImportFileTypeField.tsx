import {useId} from "react";
import type {ImportUploadFormValues} from "@/lib/schemas/imports.schema";
import {Field, FieldError, FieldTitle} from "@/lib/client/components/ui/field";
import {type Control, Controller, type FieldPathByValue} from "react-hook-form";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";


interface ImportFileTypeFieldProps {
    label: string;
    isSubmitting: boolean;
    options: readonly string[];
    control: Control<ImportUploadFormValues>;
    name: FieldPathByValue<ImportUploadFormValues, string>;
}


export function ImportFileTypeField({ control, name, label, options, isSubmitting }: ImportFileTypeFieldProps) {
    const fieldId = useId();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                    <FieldTitle id={fieldId}>
                        {label}
                    </FieldTitle>
                    <ToggleGroup
                        ref={field.ref}
                        className="flex-wrap"
                        onBlur={field.onBlur}
                        disabled={isSubmitting}
                        aria-labelledby={fieldId}
                        aria-invalid={fieldState.invalid}
                        value={field.value ? [field.value] : []}
                        onValueChange={(values) => {
                            if (values.length > 0) field.onChange(values[0]);
                        }}
                    >
                        {options.map((type, idx) =>
                            <ToggleGroupItem key={type} value={type} variant="outline">
                                {idx + 1}. {type}.csv
                            </ToggleGroupItem>
                        )}
                    </ToggleGroup>
                    <FieldError errors={[fieldState.error]}/>
                </Field>
            )}
        />
    );
}
