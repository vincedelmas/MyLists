import {FormattedError, FormZodError} from "@/lib/utils/error-classes";


export const displayContainerError = ({ error, withFormError = true }: { error: Error | null, withFormError?: boolean }) => {
    if (!error) return null;
    if (error instanceof FormattedError) return error.message;
    if (withFormError && error instanceof FormZodError) return error.issues?.[0]?.message;
    return error.message || "An unexpected error occurred";
};


export const displayPageFormError = (error: Error | null) => {
    if (error instanceof FormZodError) return error.issues?.[0]?.message;
};
