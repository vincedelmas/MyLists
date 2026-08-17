import {CircleCheck} from "lucide-react";


interface SearchMediaListIndicatorProps {
    mediaName: string;
    presentation?: "row" | "corner";
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
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-success/20
            bg-success/5 px-2.5 text-xs font-medium text-success"
        >
            <CircleCheck className="size-4"/>
            <span className="max-sm:sr-only">In list</span>
        </span>
    );
};
