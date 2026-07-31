import * as React from "react";
import {useRender} from "@base-ui/react/use-render";
import {cn} from "@/lib/utils/classnames";
import {Label} from "@/lib/client/components/ui/label";
import {Controller, type ControllerProps, type FieldPath, type FieldValues, FormProvider, useFormContext, useFormState} from "react-hook-form";


type FormItemContextValue = { id: string };

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
    name: TName
};

type FormControlProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
    children: React.ReactElement
};


const Form = FormProvider;
const FormItemContext = React.createContext<FormItemContextValue | null>(null);
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);


const useFormFieldState = () => {
    const { getFieldState } = useFormContext();
    const fieldContext = React.use(FormFieldContext);
    const formState = useFormState({ name: fieldContext?.name });

    if (!fieldContext) {
        throw new Error("useFormField should be used within <FormField>");
    }

    return {
        name: fieldContext.name,
        ...getFieldState(fieldContext.name, formState),
    };
};


const useFormField = () => {
    const fieldState = useFormFieldState();
    const itemContext = React.use(FormItemContext);

    if (!itemContext) {
        throw new Error("useFormField should be used within <FormItem>");
    }

    const { id } = itemContext;

    return {
        id,
        ...fieldState,
        formItemId: `${id}-form-item`,
        formMessageId: `${id}-form-item-message`,
        formDescriptionId: `${id}-form-item-description`,
    };
};


const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({...props}: ControllerProps<TFieldValues, TName>) => {
    return (
        <FormFieldContext value={{ name: props.name }}>
            <Controller {...props}/>
        </FormFieldContext>
    );
};


function FormItem({className, ...props}: React.ComponentProps<"div">) {
    const id = React.useId();
    const { error } = useFormFieldState();

    return (
        <FormItemContext value={{ id }}>
            <div
                role="group"
                data-slot="form-item"
                data-invalid={!!error}
                className={cn("group/field grid w-full gap-2 data-[invalid=true]:text-destructive", className)}
                {...props}
            />
        </FormItemContext>
    );
}


function FormLabel({className, ...props}: React.ComponentProps<typeof Label>) {
    const { error, formItemId } = useFormField();

    return (
        <Label
            data-error={!!error}
            data-slot="form-label"
            className={cn(
                "group/field-label peer/field-label w-fit leading-snug data-[error=true]:text-destructive group-data-[disabled=true]/field:opacity-50",
                className
            )}
            htmlFor={formItemId}
            {...props}
        />
    );
}


function FormControl({children, ...props}: FormControlProps) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return useRender({
        defaultTagName: "div",
        render: children,
        props: {
            id: formItemId,
            "aria-invalid": !!error,
            "data-slot": "form-control",
            "aria-describedby": error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId,
            ...props,
        },
    });
}


function FormDescription({className, ...props}: React.ComponentProps<"p">) {
    const { formDescriptionId } = useFormField();

    return (
        <p
            id={formDescriptionId}
            data-slot="form-description"
            className={cn(
                "text-left text-sm leading-normal font-normal text-muted-foreground last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
                className
            )}
            {...props}
        />
    );
}


function FormMessage({className, ...props}: React.ComponentProps<"div">) {
    const { error, formMessageId } = useFormField();
    const body = error ? getErrorMessage(error) : props.children;

    if (!body) {
        return null;
    }

    return (
        <div
            id={formMessageId}
            role="alert"
            data-slot="form-message"
            className={cn("text-sm font-normal text-destructive", className)}
            {...props}
        >
            {body}
        </div>
    );
}


function getErrorMessage(error: unknown, seen = new WeakSet<object>()): string | undefined {
    if (!error || typeof error !== "object") return;
    if (seen.has(error)) return;
    seen.add(error);

    if ("message" in error && typeof error.message === "string") {
        return error.message;
    }

    for (const nestedError of Object.values(error)) {
        const message = getErrorMessage(nestedError, seen);
        if (message) return message;
    }
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
};
