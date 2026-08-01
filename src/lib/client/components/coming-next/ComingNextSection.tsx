import {MediaType} from "@/lib/utils/enums";
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
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-8 rounded bg-brand block mr-1"/>
                {title}
            </h2>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
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
