import {Link} from "@tanstack/react-router";
import {ArrowRight, Play} from "lucide-react";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {ContinueCard} from "@/lib/client/components/continue/ContinueCard";
import {useContinueOrder} from "@/lib/client/components/continue/use-continue-order";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {groupContinueItems} from "@/lib/client/components/continue/group-continue-items";


export const ContinuePreview = ({ items, isCurrent }: { items: ContinueItem[]; isCurrent: boolean }) => {
    const isSmallScreen = useBreakpoint("sm");
    const orderedItems = useContinueOrder(items);
    const { active } = groupContinueItems(orderedItems);

    if (active.length === 0) return null;

    return (
        <section aria-labelledby="continue-preview-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2 id="continue-preview-title" className="flex items-center gap-2 text-sm font-semibold">
                        <Play className="size-4 text-brand" aria-hidden="true"/>
                        {isCurrent
                            ? "Continue"
                            : "In progress"
                        }
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Currently watching, reading, or playing
                    </p>
                </div>
                {isCurrent &&
                    <Link to="/continue" aria-label="View all in-progress media" className={buttonVariants({ variant: "outline", size: "sm" })}>
                        View all
                        <ArrowRight data-icon="inline-end"/>
                    </Link>
                }
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {active.slice(0, isSmallScreen ? 2 : 5).map(item =>
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
