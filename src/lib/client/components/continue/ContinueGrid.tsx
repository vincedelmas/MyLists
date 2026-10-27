import {ContinueCard} from "@/lib/client/components/continue/ContinueCard";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export const ContinueGrid = ({ items, readOnly = false }: { items: ContinueItem[]; readOnly?: boolean }) => {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map(item =>
                    <ContinueCard
                        item={item}
                        readOnly={readOnly}
                        key={`${item.mediaType}-${item.mediaId}`}
                    />
                )}
            </div>

        </div>
    );
};
