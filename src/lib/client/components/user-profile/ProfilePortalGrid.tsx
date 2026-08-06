import {Link} from "@tanstack/react-router";
import {Activity, ArrowUpRight, ChartNoAxesColumn, ListOrdered} from "lucide-react";


interface ProfilePortalGridProps {
    username: string;
}


const portalClassName = `group rounded-xl border border-border/70 outline-none transition-all duration-200
hover:-translate-y-0.5 hover:border-brand/30 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50`;


const Arrow = () => (
    <ArrowUpRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200
        group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground
        group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:text-foreground"
    />
);


// Selected profile navigation. Other preserved alternatives remain available alongside this component.
export const ProfilePortalGrid = ({ username }: ProfilePortalGridProps) => {
    return (
        <nav aria-label={`Explore ${username}'s profile`} className="grid grid-cols-2 gap-2">
            <Link
                to="/stats/$username"
                params={{ username }}
                className={`${portalClassName} col-span-2 flex items-center gap-3 p-3`}
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <ChartNoAxesColumn aria-hidden="true" className="size-4"/>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                        Statistics
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        Ratings, time and deeper trends
                    </span>
                </span>
                <Arrow/>
            </Link>

            <Link
                params={{ username }}
                to="/activity/$username"
                search={{ year: undefined, month: undefined }}
                className={`${portalClassName} flex min-h-22 flex-col justify-between p-3`}
            >
                <span className="flex items-center justify-between">
                    <Activity aria-hidden="true" className="size-4 text-brand"/>
                    <Arrow/>
                </span>
                <span>
                    <span className="block text-sm font-semibold">
                        Activity
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        Recent updates
                    </span>
                </span>
            </Link>

            <Link
                to="/collections/user/$username"
                params={{ username }}
                className={`${portalClassName} flex min-h-22 flex-col justify-between p-3`}
            >
                <span className="flex items-center justify-between">
                    <ListOrdered aria-hidden="true" className="size-4 text-brand"/>
                    <Arrow/>
                </span>
                <span>
                    <span className="block text-sm font-semibold">
                        Collections
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        Curated lists
                    </span>
                </span>
            </Link>
        </nav>
    );
};
