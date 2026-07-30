import * as React from "react";
import {cn} from "@/lib/utils/classnames";
import {Progress as ProgressPrimitive} from "@base-ui/react/progress";


type ProgressProps = ProgressPrimitive.Root.Props & { color?: React.CSSProperties["background"] };
type ProgressIndicatorProps = ProgressPrimitive.Indicator.Props & { color?: React.CSSProperties["background"] };


function Progress({ className, children, value, color, ...props }: ProgressProps) {
    return (
        <ProgressPrimitive.Root
            value={value}
            data-slot="progress"
            className={cn("flex flex-wrap gap-1.5", className)}
            {...props}
        >
            {children}
            <ProgressTrack>
                <ProgressIndicator color={color}/>
            </ProgressTrack>
        </ProgressPrimitive.Root>
    );
}


function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
    return (
        <ProgressPrimitive.Track
            data-slot="progress-track"
            className={cn("relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted", className)}
            {...props}
        />
    )
}


function ProgressIndicator({ className, color, ...props }: ProgressIndicatorProps) {
    return (
        <ProgressPrimitive.Indicator
            style={{ background: color }}
            data-slot="progress-indicator"
            className={cn("h-full bg-primary transition-all", className)}
            {...props}
        />
    )
}


function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
    return (
        <ProgressPrimitive.Label
            data-slot="progress-label"
            className={cn("text-sm font-medium", className)}
            {...props}
        />
    )
}


function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
    return (
        <ProgressPrimitive.Value
            data-slot="progress-value"
            className={cn("ml-auto text-sm text-muted-foreground tabular-nums", className)}
            {...props}
        />
    )
}


export {
    Progress,
    ProgressTrack,
    ProgressIndicator,
    ProgressLabel,
    ProgressValue,
}
