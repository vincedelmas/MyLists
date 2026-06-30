import React from "react";
import {LoaderCircle} from "lucide-react";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {useFieldContext, useFormContext} from "@/lib/client/components/forms/form";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


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
    validatingLabel?: string;
};


export function TextField({ label, description, validatingLabel, ...props }: TextFieldProps) {
    const field = useFieldContext<string>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>
                {label}
            </FieldLabel>
            <Input
                id={field.name}
                name={field.name}
                aria-invalid={isInvalid}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(ev) => field.handleChange(ev.target.value)}
                {...props}
            />

            {description &&
                <FieldDescription>
                    {description}
                </FieldDescription>
            }

            {validatingLabel && field.state.meta.isValidating &&
                <FieldDescription role="status">
                    {validatingLabel}
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


type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
    label: string;
    pendingMs?: number;
    pendingMinMs?: number;
};


export function SubmitButton({ label, pendingMs = 250, pendingMinMs = 300, disabled, className, ...props }: SubmitButtonProps) {
    const form = useFormContext();

    return (
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isValidating]}>
            {([canSubmit, isSubmitting, isValidating]) =>
                <SubmitButtonContent
                    {...props}
                    label={label}
                    className={className}
                    pendingMs={pendingMs}
                    isSubmitting={isSubmitting}
                    pendingMinMs={pendingMinMs}
                    disabled={disabled || !canSubmit || isSubmitting || isValidating}
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
        <Button
            {...props}
            type="submit"
            className={className}
            disabled={disabled || showLoading}
            aria-busy={isSubmitting || showLoading}
        >
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
