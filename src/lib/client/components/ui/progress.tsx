import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import * as ProgressPrimitive from "@radix-ui/react-progress";


function Progress({ className, value, color, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            className={cn("bg-primary/20 relative h-2.5 w-full overflow-hidden rounded-full", className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                data-slot="progress-indicator"
                className="h-full w-full flex-1 transition-all"
                style={{ background: color, transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    );
}


export {Progress};
