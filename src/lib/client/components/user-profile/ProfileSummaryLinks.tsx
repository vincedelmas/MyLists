import {Link} from "@tanstack/react-router";
import {Activity, ChartNoAxesColumn, LibraryBig} from "lucide-react";


interface ProfileSummaryLinksProps {
    username: string;
}


const linkClassName = `group flex min-w-0 items-center justify-center gap-1.5 px-1 py-2.5 text-xs font-medium
text-muted-foreground outline-none transition-colors hover:bg-background/70 hover:text-foreground
focus-visible:bg-background/70 focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-inset
focus-visible:ring-ring/50`;


// Preserved Level Breakdown footer version for easy comparison and restoration.
export const ProfileSummaryLinks = ({ username }: ProfileSummaryLinksProps) => {
    return (
        <nav aria-label={`Explore ${username}'s profile`} className="grid w-full grid-cols-3">
            <Link
                to="/stats/$username"
                params={{ username }}
                className={linkClassName}
            >
                <ChartNoAxesColumn aria-hidden="true" className="size-3.5 opacity-70 group-hover:opacity-100"/>
                Stats
            </Link>
            <Link
                to="/activity/$username"
                params={{ username }}
                search={{ year: undefined, month: undefined }}
                className={`${linkClassName} border-l border-border/70`}
            >
                <Activity aria-hidden="true" className="size-3.5 opacity-70 group-hover:opacity-100"/>
                Activity
            </Link>
            <Link
                to="/collections/user/$username"
                params={{ username }}
                className={`${linkClassName} border-l border-border/70`}
            >
                <LibraryBig aria-hidden="true" className="size-3.5 opacity-70 group-hover:opacity-100"/>
                Collections
            </Link>
        </nav>
    );
};
