import type React from "react";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";


type SubmitButtonProps = Omit<React.ComponentProps<typeof LoadingButton>, "type" | "delayLoading">;


export function FormSubmitButton(props: SubmitButtonProps) {
    return (
        <LoadingButton
            {...props}
            type="submit"
            delayLoading={true}
        />
    );
}
