import type React from "react";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";


type LoadingButtonProps = React.ComponentProps<typeof Button> & {
    isLoading?: boolean;
    icon?: React.ReactNode;
    delayLoading?: boolean;
};


export function LoadingButton({ children, disabled, icon, isLoading = false, delayLoading = false, ...props }: LoadingButtonProps) {
    const delayedLoading = useDelayedLoading(isLoading && delayLoading);
    const showLoading = delayLoading ? delayedLoading : isLoading;

    return (
        <Button
            {...props}
            aria-busy={isLoading || showLoading}
            disabled={disabled || isLoading || showLoading}
        >
            {showLoading
                ? <Spinner data-icon="inline-start" aria-hidden="true" className="text-current"/>
                : icon
            }
            {children}
        </Button>
    );
}
