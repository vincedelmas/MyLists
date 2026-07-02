import {createFormHook, createFormHookContexts} from "@tanstack/react-form";
import {CheckboxField, FormError, FormFieldset, FormRoot, NumberField, SelectField, SubmitButton, SwitchField, TextareaField, TextField} from "@/lib/client/components/forms/form-components";


export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();


export const { useAppForm, withForm, withFieldGroup } = createFormHook({
    formContext,
    fieldContext,
    fieldComponents: {
        TextField,
        NumberField,
        SelectField,
        SwitchField,
        CheckboxField,
        TextareaField,
    },
    formComponents: {
        FormError,
        FormRoot,
        FormFieldset,
        SubmitButton,
    },
});
