import {ContinueCard} from "@/lib/client/components/continue/ContinueCard";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export const ContinueGrid = ({ items, readOnly = false }: { items: ContinueItem[]; readOnly?: boolean }) => (
    <MediaListGrid>
        {items.map(item =>
            <ContinueCard
                item={item}
                readOnly={readOnly}
                key={`${item.mediaType}-${item.mediaId}`}
            />
        )}
    </MediaListGrid>
);
