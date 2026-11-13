import {cn} from "@/lib/utils/classnames";
import {Check, CircleCheck} from "lucide-react";


interface MediaListIndicatorProps {
    mediaName: string;
    className?: string;
    presentation?: "row" | "inline" | "icon";
}


export const MediaListIndicator = ({ mediaName, presentation = "row", className }: MediaListIndicatorProps) => {
    const label = `${mediaName} is already in your list`;

    if (presentation === "icon") {
        return (
            <span
                role="img"
                aria-label={label}
                title="In your list"
                className={cn("pointer-events-auto shrink-0 text-brand", className)}
            >
                <Check
                    aria-hidden="true"
                    className="size-4"
                />
            </span>
        );
    }

    return (
        <span
            aria-label={label}
            title="Already in your list"
            className={cn(
                presentation === "inline"
                    ? "flex items-center gap-1.5 text-sm text-success"
                    : "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-success/20 bg-success/5 px-2.5 text-xs font-medium text-success",
                className,
            )}
        >
            <CircleCheck className="size-4"/>
            <span className={presentation === "row" ? "max-sm:sr-only" : undefined}>
                {presentation === "inline"
                    ? "In your list"
                    : "In list"
                }
            </span>
        </span>
    );
};
