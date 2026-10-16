import {Copy, Heart} from "lucide-react";
import {formatNumber} from "@/lib/utils/formatting/number";
import type {CollectionSummaryData} from "@/lib/client/react-query/query-options";


interface CollectionStatsProps {
    collection: Pick<CollectionSummaryData, "likeCount" | "copiedCount">;
}


export const CollectionStats = ({ collection }: CollectionStatsProps) => {
    return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {[
                { label: "Likes", icon: Heart, count: collection.likeCount },
                { label: "Copies", icon: Copy, count: collection.copiedCount },
            ].map(({ label, icon: Icon, count }) =>
                <span key={label} className="flex items-center gap-1.5" title={label}>
                    <Icon className="size-3.5 text-brand" aria-hidden="true"/>
                    <span className="tabular-nums">
                        {formatNumber(count)}
                    </span>
                    <span className="sr-only">
                        {" "}{label.toLowerCase()}
                    </span>
                </span>
            )}
        </div>
    );
};
