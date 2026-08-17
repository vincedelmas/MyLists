import {useEffect, useState} from "react";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {ArrowRight, CalendarRange, X} from "lucide-react";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {yearRecapReleasesOptions} from "@/lib/client/react-query/query-options";


export function YearRecapReleaseRibbon() {
    const { currentUser } = useAuth();
    const [dismissal, setDismissal] = useState({ key: "", dismissed: true });
    const { data: releases = [] } = useQuery({ ...yearRecapReleasesOptions, enabled: Boolean(currentUser) });

    const release = releases.find(({ isAvailable }) => isAvailable);
    const storageKey = currentUser && release ? `year-recap-ribbon:${currentUser.id}:${release.year}` : "";

    useEffect(() => {
        if (!storageKey) return;
        setDismissal({ key: storageKey, dismissed: localStorage.getItem(storageKey) === "dismissed" });
    }, [storageKey]);

    if (!currentUser || !release?.isAvailable || dismissal.key !== storageKey || dismissal.dismissed) {
        return null;
    }

    const dismiss = () => {
        localStorage.setItem(storageKey, "dismissed");
        setDismissal({ key: storageKey, dismissed: true });
    };

    return (
        <aside className="border-b border-brand/30 bg-brand/10" aria-label={`${release.year} recap announcement`}>
            <div className="relative flex items-center mx-auto h-10 max-w-7xl gap-3 text-sm md:px-8">
                <CalendarRange
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand"
                />
                <span className="font-medium">
                    Your {release.year} recap is available.
                </span>
                <Link
                    to="/stats/$username"
                    params={{ username: currentUser.name }}
                    search={{ activeTab: "overview", recap: release.year }}
                    className={buttonVariants({ variant: "ghost", size: "sm", className: "text-brand" })}
                >
                    View recap
                    <ArrowRight/>
                </Link>
                <Button
                    size="bare"
                    variant="ghost"
                    onClick={dismiss}
                    className="absolute right-2 md:right-10"
                    aria-label={`Dismiss ${release.year} recap announcement`}
                >
                    <X/>
                </Button>
            </div>
        </aside>
    );
}
