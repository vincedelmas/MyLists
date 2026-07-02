import {AnyFormApi} from "@tanstack/react-form";
import {ValidationError} from "@/lib/utils/error-classes";
import {DEFAULT_ERROR_MESSAGE} from "@/lib/utils/constants";


/**
 * Runs an async form operation and converts thrown errors to TanStack Form validator errors.
 */
export async function handleFormSubmit(formApi: AnyFormApi, operation: () => Promise<unknown>) {
    try {
        await operation();
        return true;
    }
    catch (error) {
        if (error instanceof ValidationError) {
            formApi.setFieldMeta(error.field, (meta) => ({
                ...meta,
                isTouched: true,
                errorMap: { ...meta.errorMap, onSubmit: error.message },
            }));
            return false;
        }

        formApi.setErrorMap({
            ...formApi.state.errorMap,
            onSubmit: (error as any)?.message ?? DEFAULT_ERROR_MESSAGE,
        });
        return false;
    }
}
