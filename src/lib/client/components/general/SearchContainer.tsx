import {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {Loader2, SearchX} from "lucide-react";
import {displayContainerError} from "@/lib/utils/error-display";
import {EmptyState} from "@/lib/client/components/general/EmptyState";


interface SearchContainerProps {
    search: string;
    isOpen: boolean;
    isPending: boolean;
    className?: string;
    hasResults: boolean;
    children: ReactNode;
    error?: Error | null;
    emptyMessage?: string;
    debouncedSearch: string;
    minSearchLength?: number;
    position?: "top" | "bottom";
}


export const SearchContainer = (props: SearchContainerProps) => {
    const {
        search, isOpen, isPending, hasResults, debouncedSearch,
        children, className, error, emptyMessage, position = "bottom", minSearchLength = 2
    } = props;

    if (!isOpen || search.trim().length === 0 || debouncedSearch.trim().length < minSearchLength) {
        return null;
    }

    return (
        <div className={cn(
            "absolute z-50 w-full bg-background border rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200",
            position === "bottom" ? "top-full mt-1" : "bottom-full mb-1", className)}
        >
            {isPending &&
                <div className="flex items-center justify-center p-6 text-app-accent">
                    <Loader2 className="size-6 animate-spin"/>
                </div>
            }

            {(!isPending && error) &&
                <div className="p-4 text-sm text-destructive text-center">
                    {displayContainerError({ error })}
                </div>
            }

            {(!isPending && !error && !hasResults) &&
                <EmptyState
                    icon={SearchX}
                    className="py-4"
                    message={emptyMessage || `No results found for '${debouncedSearch}'`}
                />
            }

            {(!isPending && hasResults) &&
                children
            }
        </div>
    );
};
