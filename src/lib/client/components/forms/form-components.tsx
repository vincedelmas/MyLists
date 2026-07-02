import React from "react";
import {LoaderCircle} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Switch} from "@/lib/client/components/ui/switch";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {useFieldContext, useFormContext} from "@/lib/client/components/forms/form";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


type FormRootProps = Omit<React.ComponentProps<"form">, "onSubmit">;


export function FormRoot({ children, ...props }: FormRootProps) {
    const form = useFormContext();

    return (
        <form
            {...props}
            onSubmit={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                void form.handleSubmit();
            }}
        >
            {children}
        </form>
    );
}


export function FormFieldset({ children, disabled, ...props }: React.ComponentProps<"fieldset">) {
    const form = useFormContext();

    return (
        <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) =>
                <fieldset {...props} disabled={disabled || isSubmitting}>
                    {children}
                </fieldset>
            }
        </form.Subscribe>
    );
}


export function FormError() {
    const form = useFormContext();

    const getFormErrorMessage = (error: unknown) => {
        if (typeof error === "string") return error;
        if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
            return error.message;
        }
        return undefined;
    };

    return (
        <form.Subscribe selector={(state) => state.errorMap}>
            {(errorMap) => {
                const error = (errorMap as { onSubmit?: unknown }).onSubmit;
                const message = getFormErrorMessage(error);
                return message ? <InlineErrorContainer>{message}</InlineErrorContainer> : null;
            }}
        </form.Subscribe>
    );
}


type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "id" | "name" | "value" | "onBlur" | "onChange"> & {
    description?: string;
    label: React.ReactNode;
    labelAccessory?: React.ReactNode;
};


export function TextField({ label, labelAccessory, description, className, ...props }: TextFieldProps) {
    const field = useFieldContext<string>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={isInvalid}>
            <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
                {labelAccessory}
            </div>
            <div className="relative">
                <Input
                    id={field.name}
                    name={field.name}
                    className={className}
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(ev) => field.handleChange(ev.target.value)}
                    {...props}
                />
            </div>

            {description &&
                <FieldDescription>
                    {description}
                </FieldDescription>
            }

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


type NumberFieldProps = Omit<React.ComponentProps<typeof Input>, "id" | "name" | "type" | "value" | "onBlur" | "onChange"> & {
    description?: string;
    label: React.ReactNode;
};


export function NumberField({ label, description, ...props }: NumberFieldProps) {
    const field = useFieldContext<number>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Input
                {...props}
                type="number"
                id={field.name}
                name={field.name}
                aria-invalid={isInvalid}
                onBlur={field.handleBlur}
                value={Number.isNaN(field.state.value) ? "" : field.state.value}
                onChange={(ev) => field.handleChange(ev.target.valueAsNumber)}
            />

            {description &&
                <FieldDescription>
                    {description}
                </FieldDescription>
            }

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


type TextareaFieldProps = Omit<React.ComponentProps<typeof Textarea>, "id" | "name" | "value" | "onBlur" | "onChange"> & {
    label: string;
    description?: string;
};


export function TextareaField({ label, description, ...props }: TextareaFieldProps) {
    const field = useFieldContext<string | undefined>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>
                {label}
            </FieldLabel>

            <Textarea
                id={field.name}
                name={field.name}
                aria-invalid={isInvalid}
                onBlur={field.handleBlur}
                value={field.state.value ?? ""}
                onChange={(ev) => field.handleChange(ev.target.value)}
                {...props}
            />

            {description &&
                <FieldDescription>
                    {description}
                </FieldDescription>
            }

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


interface SelectFieldProps {
    className?: string;
    placeholder?: string;
    label: React.ReactNode;
    labelAccessory?: React.ReactNode;
    onValueChange?: (value: string) => void;
    options: {
        value: string;
        disabled?: boolean;
        label: React.ReactNode;
    }[];
}


export function SelectField({ label, labelAccessory, options, placeholder, className, onValueChange }: SelectFieldProps) {
    const field = useFieldContext<string>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={isInvalid}>
            <div className="flex items-center gap-2">
                <FieldLabel htmlFor={field.name}>
                    {label}
                </FieldLabel>
                {labelAccessory}
            </div>

            <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                    field.handleChange(value);
                    onValueChange?.(value);
                }}
            >
                <SelectTrigger id={field.name} className={cn("w-full", className)} onBlur={field.handleBlur} aria-invalid={isInvalid}>
                    <SelectValue placeholder={placeholder}/>
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) =>
                        <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


type CheckboxFieldProps = Omit<React.ComponentProps<typeof Checkbox>, "id" | "name" | "checked" | "onBlur" | "onCheckedChange"> & {
    className?: string;
    label: React.ReactNode;
    description?: React.ReactNode;
    labelClassName?: string;
    descriptionClassName?: string;
    onCheckedChange?: (checked: boolean) => void;
};


export function CheckboxField({
    label,
    className,
    description,
    labelClassName,
    onCheckedChange,
    descriptionClassName,
    ...props
}: CheckboxFieldProps) {
    const field = useFieldContext<boolean>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field className={className} data-invalid={isInvalid}>
            <div className={cn("flex gap-2", description ? "items-start" : "items-center")}>
                <Checkbox
                    {...props}
                    id={field.name}
                    name={field.name}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                        const value = checked === true;
                        field.handleChange(value);
                        onCheckedChange?.(value);
                    }}
                />
                <div className={cn(description && "space-y-1")}>
                    <FieldLabel htmlFor={field.name} className={labelClassName}>
                        {label}
                    </FieldLabel>
                    {description &&
                        <FieldDescription className={descriptionClassName}>
                            {description}
                        </FieldDescription>
                    }
                </div>
            </div>

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


type SwitchFieldProps = Omit<React.ComponentProps<typeof Switch>, "id" | "name" | "checked" | "onBlur" | "onCheckedChange"> & {
    className?: string;
    label: React.ReactNode;
    labelClassName?: string;
    onCheckedChange?: (checked: boolean) => void;
};


export function SwitchField({ label, className, labelClassName, onCheckedChange, ...props }: SwitchFieldProps) {
    const field = useFieldContext<boolean>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field className={className} data-invalid={isInvalid}>
            <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor={field.name} className={labelClassName}>
                    {label}
                </FieldLabel>
                <Switch
                    {...props}
                    id={field.name}
                    name={field.name}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                        field.handleChange(checked);
                        onCheckedChange?.(checked);
                    }}
                />
            </div>

            {isInvalid &&
                <FieldError
                    errors={field.state.meta.errors}
                />
            }
        </Field>
    );
}


type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
    label: string;
    pendingMs?: number;
    pendingMinMs?: number;
    requireDirty?: boolean;
};


export function SubmitButton({ label, pendingMs = 250, pendingMinMs = 300, requireDirty = false, disabled, className, ...props }: SubmitButtonProps) {
    const form = useFormContext();

    return (
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isValidating, state.isDirty]}>
            {([canSubmit, isSubmitting, isValidating, isDirty]) =>
                <SubmitButtonContent
                    {...props}
                    label={label}
                    className={className}
                    pendingMs={pendingMs}
                    isSubmitting={isSubmitting}
                    pendingMinMs={pendingMinMs}
                    disabled={disabled || !canSubmit || isSubmitting || isValidating || (requireDirty && !isDirty)}
                />
            }
        </form.Subscribe>
    );
}


type SubmitButtonContentProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
    label: string;
    pendingMs: number;
    pendingMinMs: number;
    isSubmitting: boolean;
};


function SubmitButtonContent({ label, isSubmitting, pendingMs, pendingMinMs, className, disabled, ...props }: SubmitButtonContentProps) {
    const showLoading = useDelayedLoading(isSubmitting, pendingMs, pendingMinMs);

    return (
        <Button {...props} type="submit" className={className} disabled={disabled || showLoading} aria-busy={isSubmitting || showLoading}>
            {showLoading &&
                <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                />
            }
            {label}
        </Button>
    );
}
