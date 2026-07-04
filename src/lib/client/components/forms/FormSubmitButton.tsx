import React from "react";
import {LoaderCircle} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";


type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
    isLoading?: boolean;
};


export function FormSubmitButton({ children, className, disabled, isLoading = false, ...props }: SubmitButtonProps) {
    const showLoading = useDelayedLoading(isLoading);
    const isDisabled = disabled || isLoading || showLoading;

    return (
        <Button
            {...props}
            type="submit"
            className={className}
            disabled={isDisabled}
            aria-busy={isLoading || showLoading}
        >
            {showLoading &&
                <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                />
            }
            {children}
        </Button>
    );
}
