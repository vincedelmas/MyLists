import {Link} from "@tanstack/react-router";
import {Activity, ChartNoAxesColumn, LibraryBig} from "lucide-react";
import {cn} from "@/lib/utils/classnames";


interface ProfileQuickLinksInlineProps {
    username: string;
    className?: string;
}


const linkClassName = `group inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium
text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground
focus-visible:ring-3 focus-visible:ring-ring/50`;


// Preserved direct-link version for easy comparison and restoration.
export const ProfileQuickLinksInline = ({ username, className }: ProfileQuickLinksInlineProps) => {
    return (
        <nav
            aria-label={`Explore ${username}'s profile`}
            className={cn("flex items-center gap-0.5", className)}
        >
            <Link
                to="/stats/$username"
                params={{ username }}
                className={linkClassName}
            >
                <ChartNoAxesColumn aria-hidden="true" className="size-3.5 opacity-70 transition-opacity group-hover:opacity-100"/>
                Stats
            </Link>
            <Link
                to="/activity/$username"
                params={{ username }}
                search={{ year: undefined, month: undefined }}
                className={linkClassName}
            >
                <Activity aria-hidden="true" className="size-3.5 opacity-70 transition-opacity group-hover:opacity-100"/>
                Activity
            </Link>
            <Link
                to="/collections/user/$username"
                params={{ username }}
                className={linkClassName}
            >
                <LibraryBig aria-hidden="true" className="size-3.5 opacity-70 transition-opacity group-hover:opacity-100"/>
                Collections
            </Link>
        </nav>
    );
};
