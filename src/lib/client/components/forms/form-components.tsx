import React from "react";
import {Check, CircleAlert, LoaderCircle, X} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {useFieldContext, useFormContext} from "@/lib/client/components/forms/form";
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


type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "id" | "name" | "value" | "onBlur" | "onChange"> & {
    label: string;
    description?: string;
    showValStatus?: boolean;
};


export function TextField({ label, description, showValStatus = false, className, ...props }: TextFieldProps) {
    const field = useFieldContext<string>();
    const isValidationInvalid = !field.state.meta.isValid;
    const isChecking = showValStatus && field.state.meta.isValidating;
    const isValUnavailable = isStatusUnavailable(field.state.meta.errors);
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
    const showValidationResult = showValStatus && field.state.meta.isDirty && !isChecking;

    function isStatusUnavailable(error: unknown): boolean {
        if (Array.isArray(error)) return error.some((item) => isStatusUnavailable(item));
        return !!error && typeof error === "object" && "validationStatus" in error && error.validationStatus === "unavailable";
    }

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>
                {label}
            </FieldLabel>
            <div className="relative">
                <Input
                    id={field.name}
                    name={field.name}
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    aria-busy={isChecking || undefined}
                    className={cn(showValStatus && "pr-9", className)}
                    onChange={(ev) => field.handleChange(ev.target.value)}
                    {...props}
                />
                {(isChecking || showValidationResult) &&
                    <span
                        role="status"
                        aria-label={isChecking
                            ? "Validating" : isValUnavailable
                                ? "Validation unavailable" : isValidationInvalid
                                    ? "Invalid" : "Valid"
                        }
                        className={cn(
                            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2",
                            isChecking && "text-muted-foreground",
                            showValidationResult && isValUnavailable && "text-amber-500",
                            showValidationResult && isValidationInvalid && !isValUnavailable && "text-destructive",
                            showValidationResult && !isValidationInvalid && "text-emerald-500"
                        )}
                    >
                        {isChecking
                            ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin"/> : isValUnavailable
                                ? <CircleAlert aria-hidden="true" className="size-4"/> : isValidationInvalid
                                    ? <X aria-hidden="true" className="size-4"/> : <Check aria-hidden="true" className="size-4"/>
                        }
                    </span>
                }
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
    placeholder?: string;
    label: React.ReactNode;
    labelAccessory?: React.ReactNode;
    options: {
        value: string;
        disabled?: boolean;
        label: React.ReactNode;
    }[];
}


export function SelectField({ label, labelAccessory, options, placeholder }: SelectFieldProps) {
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

            <Select name={field.name} value={field.state.value} onValueChange={field.handleChange}>
                <SelectTrigger id={field.name} className="w-full" onBlur={field.handleBlur} aria-invalid={isInvalid}>
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
