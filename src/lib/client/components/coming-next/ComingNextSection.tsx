import {CalendarDays} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/number-formatting";
import {ComingNextItem} from "@/lib/types/query.options.types";
import {ComingNextCard} from "@/lib/client/components/coming-next/ComingNextCard";


interface ComingNextSectionProps {
    title: string;
    items: (ComingNextItem & { mediaType: MediaType })[];
}


export const ComingNextSection = ({ title, items }: ComingNextSectionProps) => {
    if (items.length === 0) return null;

    return (
        <section>
            <header className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <CalendarDays className="size-4 text-brand" aria-hidden="true"/>
                    {title}
                </h2>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatNumber(items.length)} {items.length === 1 ? "release" : "releases"}
                </span>
            </header>
            <div className="grid gap-3 pt-4 sm:grid-cols-2">
                {items.map((item, idx) =>
                    <ComingNextCard
                        item={item}
                        mediaType={item.mediaType}
                        key={`${item.mediaId}-${idx}`}
                    />
                )}
            </div>
        </section>
    );
};
