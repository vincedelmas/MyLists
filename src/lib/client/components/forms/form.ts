import {createFormHook, createFormHookContexts} from "@tanstack/react-form";
import {FormError, FormFieldset, FormRoot, SelectField, SubmitButton, SwitchField, TextareaField, TextField} from "@/lib/client/components/forms/form-components";


export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();


export const { useAppForm, withForm, withFieldGroup } = createFormHook({
    formContext,
    fieldContext,
    fieldComponents: {
        TextField,
        SelectField,
        SwitchField,
        TextareaField,
    },
    formComponents: {
        FormError,
        FormRoot,
        FormFieldset,
        SubmitButton,
    },
});
