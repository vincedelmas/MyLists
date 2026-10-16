import {Input} from "@/lib/client/components/ui/input";
import {type ComponentProps, type ReactNode, useId} from "react";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {type Control, type FieldPathByValue, type FieldValues, type UseControllerProps, useController} from "react-hook-form";


type FormTextFieldProps<T extends FieldValues, TName extends FieldPathByValue<T, string | undefined>> =
    Pick<UseControllerProps<T, TName>, "name" | "rules"> &
    Omit<ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref" | "aria-invalid" | "type" | "children"> & {
    label: ReactNode;
    control: Control<T>;
    description?: ReactNode;
    labelAction?: ReactNode;
    type?: "text" | "email" | "password" | "url" | "tel" | "search";
};


export function FormTextField<
    T extends FieldValues, TName extends FieldPathByValue<T, string | undefined>
>(props: FormTextFieldProps<T, TName>) {
    const { control, name, rules, label, description, labelAction, id, disabled, "aria-describedby": ariaDescribedBy, ...inputProps } = props;

    const generatedId = useId();
    const inputId = id ?? generatedId;
    const { field, fieldState } = useController({ control, name, rules });

    const describedBy = [
        ariaDescribedBy,
        description ? `${inputId}-description` : undefined,
        fieldState.error?.message ? `${inputId}-error` : undefined,
    ].filter(Boolean).join(" ") || undefined;

    return (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled || field.disabled}>
            {labelAction ?
                <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={inputId}>
                        {label}
                    </FieldLabel>
                    {labelAction}
                </div>
                :
                <FieldLabel htmlFor={inputId}>
                    {label}
                </FieldLabel>
            }
            <Input
                {...inputProps}
                {...field}
                id={inputId}
                value={field.value ?? ""}
                aria-describedby={describedBy}
                aria-invalid={fieldState.invalid}
                disabled={disabled || field.disabled}
            />
            {description &&
                <FieldDescription id={`${inputId}-description`}>
                    {description}
                </FieldDescription>
            }
            <FieldError
                id={`${inputId}-error`}
                errors={[fieldState.error]}
            />
        </Field>
    );
}
