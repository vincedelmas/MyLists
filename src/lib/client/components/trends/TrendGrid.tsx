import {TrendingUp} from "lucide-react";
import {TrendsMedia} from "@/lib/types/provider.types";
import {formatNumber} from "@/lib/utils/formatting/number";
import {TrendCard} from "@/lib/client/components/trends/TrendCard";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";


export const TrendGrid = ({ data }: { data: TrendsMedia[] }) => {
    return (
        <section className="pt-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Trending titles
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatNumber(data.length)} {data.length === 1 ? "title" : "titles"}
                </span>
            </div>

            {data.length === 0
                ?
                <EmptyState
                    icon={TrendingUp}
                    className="mt-5 min-h-64 rounded-xl border shadow-xs"
                    message="No trending data available right now."
                />
                :
                <MediaListGrid className="pt-5">
                    {data.map((media) =>
                        <TrendCard
                            media={media}
                            key={`${media.mediaType}-${media.apiId}`}
                        />
                    )}
                </MediaListGrid>
            }
        </section>
    );
};
