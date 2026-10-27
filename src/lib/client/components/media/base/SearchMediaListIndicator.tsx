import {CircleCheck} from "lucide-react";


interface SearchMediaListIndicatorProps {
    mediaName: string;
    presentation?: "row" | "corner" | "inline";
}


export const SearchMediaListIndicator = ({ mediaName, presentation = "row" }: SearchMediaListIndicatorProps) => {
    const label = `${mediaName} is already in your list`;

    if (presentation === "corner") {
        return (
            <span className="pointer-events-none" title="Already in your list" aria-label={label}>
                <CircleCheck className="text-success"/>
            </span>
        );
    }

    return (
        <span
            aria-label={label}
            title="Already in your list"
            className={presentation === "inline"
                ? "flex items-center gap-1.5 text-sm text-success"
                : "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-success/20 bg-success/5 px-2.5 text-xs font-medium text-success"
            }
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
