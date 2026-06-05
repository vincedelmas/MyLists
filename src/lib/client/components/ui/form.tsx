import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import {Slot} from "@radix-ui/react-slot";
import {Label} from "@/lib/client/components/ui/label";
import * as LabelPrimitive from "@radix-ui/react-label";
import {Controller, type ControllerProps, type FieldPath, type FieldValues, FormProvider, useFormContext, useFormState} from "react-hook-form";


const Form = FormProvider;


type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
    name: TName
}

type FormItemContextValue = { id: string };


const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)


const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({ ...props }: ControllerProps<TFieldValues, TName>) => {
    return (
        <FormFieldContext value={{ name: props.name }}>
            <Controller {...props}/>
        </FormFieldContext>
    );
}


const useFormField = () => {
    const { getFieldState } = useFormContext();
    const itemContext = React.use(FormItemContext);
    const fieldContext = React.use(FormFieldContext);
    const formState = useFormState({ name: fieldContext.name });
    const fieldState = getFieldState(fieldContext.name, formState);

    if (!fieldContext) {
        throw new Error("useFormField should be used within <FormField>");
    }

    const { id } = itemContext;

    return {
        id,
        name: fieldContext.name,
        formItemId: `${id}-form-item`,
        formMessageId: `${id}-form-item-message`,
        formDescriptionId: `${id}-form-item-description`,
        ...fieldState,
    }
}


const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);


function FormItem({ className, ...props }: React.ComponentProps<"div">) {
    const id = React.useId();

    return (
        <FormItemContext value={{ id }}>
            <div
                data-slot="form-item"
                className={cn("grid gap-2", className)}
                {...props}
            />
        </FormItemContext>
    )
}


function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    const { error, formItemId } = useFormField();

    return (
        <Label
            data-error={!!error}
            data-slot="form-label"
            className={cn("data-[error=true]:text-destructive", className)}
            htmlFor={formItemId}
            {...props}
        />
    )
}


function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
        <Slot
            id={formItemId}
            aria-invalid={!!error}
            data-slot="form-control"
            aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`}
            {...props}
        />
    )
}


function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
    const { formDescriptionId } = useFormField()

    return (
        <p
            id={formDescriptionId}
            data-slot="form-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}


function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message || (error as any)?.root?.message || "") : props.children;

    if (!body) {
        return null;
    }

    return (
        <p
            id={formMessageId}
            data-slot="form-message"
            className={cn("text-destructive text-sm", className)}
            {...props}
        >
            {body}
        </p>
    );
}


export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
}
