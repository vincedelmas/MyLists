import {Link} from "@tanstack/react-router";
import {ArrowUpRight} from "lucide-react";


interface ProfileDirectoryEditorialProps {
    username: string;
}


const linkClassName = `group grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5
outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3
focus-visible:ring-inset focus-visible:ring-ring/50`;


const LinkContent = ({ index, label, description }: { index: string, label: string, description: string }) => {
    return (
        <>
            <span
                aria-hidden="true"
                className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground/60"
            >
                {index}
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{description}</span>
            </span>
            <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 text-muted-foreground/50 transition-all duration-200 group-hover:-translate-y-0.5
                group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:-translate-y-0.5
                group-focus-visible:translate-x-0.5 group-focus-visible:text-foreground"
            />
        </>
    );
};


// Preserved editorial-directory version for easy comparison and restoration.
export const ProfileDirectoryEditorial = ({ username }: ProfileDirectoryEditorialProps) => {
    return (
        <nav aria-label={`Explore ${username}'s profile`}>
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Explore profile
                </span>
                <span aria-hidden="true" className="max-w-28 truncate text-[10px] text-muted-foreground/60">
                    @{username}
                </span>
            </div>
            <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card/30">
                <Link
                    to="/stats/$username"
                    params={{ username }}
                    className={linkClassName}
                >
                    <LinkContent index="01" label="Statistics" description="Ratings, time and trends"/>
                </Link>
                <Link
                    to="/activity/$username"
                    params={{ username }}
                    search={{ year: undefined, month: undefined }}
                    className={linkClassName}
                >
                    <LinkContent index="02" label="Activity" description="Updates across every list"/>
                </Link>
                <Link
                    to="/collections/user/$username"
                    params={{ username }}
                    className={linkClassName}
                >
                    <LinkContent index="03" label="Collections" description="Curated groups of media"/>
                </Link>
            </div>
        </nav>
    );
};
