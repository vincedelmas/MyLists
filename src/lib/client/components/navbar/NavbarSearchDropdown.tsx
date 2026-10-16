import {ReactNode} from "react";
import {SearchX} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {displayContainerError} from "@/lib/client/error-display";
import {EmptyState} from "@/lib/client/components/general/EmptyState";


interface NavbarSearchDropdownProps {
    search: string;
    isOpen: boolean;
    isPending: boolean;
    className?: string;
    hasResults: boolean;
    children: ReactNode;
    error?: Error | null;
    debouncedSearch: string;
}


export const NavbarSearchDropdown = (props: NavbarSearchDropdownProps) => {
    const { search, isOpen, isPending, hasResults, debouncedSearch, children, className, error } = props;

    if (!isOpen || search.trim().length === 0 || debouncedSearch.trim().length < 2) {
        return null;
    }

    return (
        <div className={cn(
            "absolute z-50 w-full bg-background border rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200",
            "top-full mt-1", className)}
        >
            {isPending &&
                <div className="flex items-center justify-center p-6">
                    <Spinner className="size-6"/>
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
                    message={`No results found for '${debouncedSearch}'`}
                />
            }

            {(!isPending && hasResults) &&
                children
            }
        </div>
    );
};
