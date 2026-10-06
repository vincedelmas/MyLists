import {Link} from "@tanstack/react-router";
import {ArrowUpRight, Layers3} from "lucide-react";
import {formatNumber} from "@/lib/utils/formatting/number";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {SmartViewBadges} from "@/lib/client/components/smart-views/SmartViewBadges";
import {SmartListCoverStrip} from "@/lib/client/components/smart-views/SmartListCoverStrip";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import type {ProfileSmartViewRecord} from "@/lib/client/react-query/query-options/smart-views.options";


interface ProfileSmartViewShortcutsProps {
    isCurrent: boolean;
    views: ProfileSmartViewRecord[];
}


export const ProfileSmartViewShortcuts = ({ views, isCurrent }: ProfileSmartViewShortcutsProps) => {
    if (views.length === 0) return null;

    return (
        <section aria-labelledby="profile-smart-views-title">
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h2 id="profile-smart-views-title" className="flex items-center gap-2 text-sm font-semibold">
                            <Layers3 className="size-4 text-brand" aria-hidden="true"/> Smart lists
                        </h2>
                    </CardTitle>
                    {isCurrent &&
                        <CardAction>
                            <Link to="/smart-views" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                                Manage
                                <ArrowUpRight data-icon="inline-end" aria-hidden="true"/>
                            </Link>
                        </CardAction>
                    }
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col">
                        {views.map(view => (
                            <article key={view.id} className="flex min-w-0 items-center gap-4 border-b py-4 first:pt-0 last:border-0 last:pb-0">
                                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                                    <h3 className="min-w-0 text-sm font-medium">
                                        <Link
                                            search={{ page: 1 }}
                                            to="/smart-views/$viewId"
                                            params={{ viewId: view.id }}
                                            className="flex items-center gap-2 rounded-sm outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <span className="truncate" title={view.spec.title}>
                                                {view.spec.title}
                                            </span>
                                            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
                                        </Link>
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {formatNumber(view.preview.total)} media
                                    </p>
                                    <SmartViewBadges
                                        compact={true}
                                        spec={view.spec}
                                    />
                                </div>
                                <SmartListCoverStrip
                                    compact={true}
                                    covers={view.preview.covers}
                                    className="hidden sm:flex"
                                />
                            </article>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};
