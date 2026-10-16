import {Link} from "@tanstack/react-router";
import {ArrowUpRight, Play} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {ContinueCard} from "@/lib/client/components/continue/ContinueCard";
import {useContinueOrder} from "@/lib/client/components/continue/use-continue-order";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {groupContinueItems} from "@/lib/client/components/continue/group-continue-items";


export const ContinuePreview = ({ items, isCurrent }: { items: ContinueItem[]; isCurrent: boolean }) => {
    const { currentUser } = useAuth();
    const orderedItems = useContinueOrder(items);
    const { active } = groupContinueItems(orderedItems);

    if (active.length === 0) return null;

    return (
        <section aria-labelledby="continue-preview-title" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2 id="continue-preview-title" className="flex items-center gap-2 text-sm font-semibold">
                        <Play className="size-4 text-brand"/>
                        {isCurrent ? "Continue" : "In progress"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Currently watching, reading, or playing
                    </p>
                </div>
                {isCurrent &&
                    <Link
                        to="/lists/continue/$username"
                        params={{ username: currentUser!.name }}
                        className={buttonVariants({ variant: "hover", size: "sm" })}
                    >
                        View all
                        <ArrowUpRight data-icon="inline-end"/>
                    </Link>
                }
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 max-sm:grid-flow-col max-sm:grid-cols-none max-sm:auto-cols-[calc((100%-0.5rem)/2)] max-sm:overflow-x-auto max-sm:pb-2 scrollbar-thin">
                {active.slice(0, 5).map(item =>
                    <ContinueCard
                        item={item}
                        compact={true}
                        readOnly={!isCurrent}
                        key={`${item.mediaType}-${item.mediaId}`}
                    />
                )}
            </div>
        </section>
    );
};
