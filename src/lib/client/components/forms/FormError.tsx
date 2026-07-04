import {useFormContext} from "react-hook-form";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";


export function FormError() {
    const { clearErrors, formState } = useFormContext();
    const error = formState.errors.root;

    if (!error?.message) return null;

    return (
        <InlineErrorContainer onDismiss={() => clearErrors("root")}>
            {error.message}
        </InlineErrorContainer>
    );
}
