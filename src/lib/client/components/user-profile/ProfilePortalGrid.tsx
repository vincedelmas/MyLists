import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {Activity, ChartNoAxesColumn, LibraryBig} from "lucide-react";
import {NavigationArrow, navigationCardClassName} from "@/lib/client/components/general/NavigationArrow";


interface ProfilePortalGridProps {
    username: string;
}


const portalClassName = cn(navigationCardClassName, "rounded-xl border border-border/70 outline-none focus-visible:ring-3 focus-visible:ring-ring/50");


export const ProfilePortalGrid = ({ username }: ProfilePortalGridProps) => {
    return (
        <nav aria-label={`Explore ${username}'s profile`} className="grid grid-cols-2 gap-2">
            <Link
                to="/lists/$username"
                params={{ username }}
                className={cn(portalClassName, "col-span-2 flex items-center gap-3 p-3")}
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <LibraryBig aria-hidden="true" className="size-4"/>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                        Lists &amp; collections
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        Lists, dynamic lists and collections
                    </span>
                </span>
                <NavigationArrow/>
            </Link>

            <Link
                params={{ username }}
                to="/activity/$username"
                search={{ year: undefined, month: undefined }}
                className={cn(portalClassName, "flex min-h-22 flex-col justify-between p-3")}
            >
                <span className="flex items-center justify-between">
                    <Activity aria-hidden="true" className="size-4 text-brand"/>
                    <NavigationArrow/>
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
                to="/stats/$username"
                params={{ username }}
                className={cn(portalClassName, "flex min-h-22 flex-col justify-between p-3")}
            >
                <span className="flex items-center justify-between">
                    <ChartNoAxesColumn aria-hidden="true" className="size-4 text-brand"/>
                    <NavigationArrow/>
                </span>
                <span>
                    <span className="block text-sm font-semibold">
                        Statistics
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        Ratings and trends
                    </span>
                </span>
            </Link>
        </nav>
    );
};
