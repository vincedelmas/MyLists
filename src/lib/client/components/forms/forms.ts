import {UseFormReturn} from "react-hook-form";
import {ValidationError} from "@/lib/utils/error-classes";
import {DEFAULT_ERROR_MESSAGE} from "@/lib/utils/constants";


export const handleServerFormErrors = (form: UseFormReturn<any>, error: Error) => {
    if (error instanceof ValidationError) {
        form.setError(error.field, { message: error.message });
    }
    form.setError("root", { message: error.message || DEFAULT_ERROR_MESSAGE });
};
