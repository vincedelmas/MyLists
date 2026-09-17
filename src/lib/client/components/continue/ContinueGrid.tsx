import {useState} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {ContinueCard} from "@/lib/client/components/continue/ContinueCard";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export const ContinueGrid = ({ items }: { items: ContinueItem[] }) => {
    const [visibleCount, setVisibleCount] = useState(12);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.slice(0, visibleCount).map(item =>
                    <ContinueCard
                        item={item}
                        key={`${item.mediaType}-${item.mediaId}`}
                    />
                )}
            </div>
            {items.length > visibleCount &&
                <div className="flex flex-col items-center gap-2 pt-2">
                    <Button variant="outline" onClick={() => setVisibleCount(count => count + 12)}>
                        Show more
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Showing {visibleCount} of {items.length} titles
                    </p>
                </div>
            }
        </div>
    );
};
