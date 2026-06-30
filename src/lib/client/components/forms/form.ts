import {createFormHook, createFormHookContexts} from "@tanstack/react-form";
import {FormFieldset, FormRoot, SelectField, SubmitButton, TextareaField, TextField} from "@/lib/client/components/forms/form-components";


export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();


export const { useAppForm, withForm, withFieldGroup } = createFormHook({
    formContext,
    fieldContext,
    fieldComponents: {
        TextField,
        SelectField,
        TextareaField,
    },
    formComponents: {
        FormRoot,
        FormFieldset,
        SubmitButton,
    },
});
