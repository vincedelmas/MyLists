import React from "react";
import {LoaderCircle} from "lucide-react";
import {useFormContext} from "react-hook-form";
import {Button} from "@/lib/client/components/ui/button";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";


type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
    disabled: boolean;
};


export function FormSubmitButton({ children, className, disabled, ...props }: SubmitButtonProps) {
    const { formState } = useFormContext();
    const showLoading = useDelayedLoading(disabled);

    return (
        <div className="flex flex-col items-center gap-4">
            {formState.errors.root &&
                <InlineErrorContainer>
                    {formState.errors.root.message}
                </InlineErrorContainer>
            }
            <Button {...props} type="submit" className={className} disabled={disabled || showLoading} aria-busy={disabled || showLoading}>
                {showLoading &&
                    <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                    />
                }
                {children}
            </Button>
        </div>
    );
}
